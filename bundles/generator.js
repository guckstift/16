var generator = (function (exports) {
	'use strict';

	const pi = Math.PI;

	function mod(x, m)
	{
		return (x % m + m) % m;
	}

	function radians(d)
	{
		return d * pi / 180;
	}

	function smoothMix(a, b, x)
	{
		return a + x ** 2 * (3 - 2 * x) * (b - a);
	}

	function smoothMix2d(aa, ba, ab, bb, x, y)
	{
		return smoothMix(
			smoothMix(aa, ba, x),
			smoothMix(ab, bb, x),
			y,
		);
	}

	const CHUNK_BITS  = 4;
	const CHUNK_WIDTH = 1 << CHUNK_BITS;
	const CHUNK_SIZE  = CHUNK_WIDTH ** 3;

	const WORLD_BITS         = 4;
	const WORLD_CHUNKS_WIDTH = 1 << WORLD_BITS;
	const WORLD_CHUNKS_SIZE  = WORLD_CHUNKS_WIDTH ** 3;

	const WORLD_WIDTH = WORLD_CHUNKS_WIDTH * CHUNK_WIDTH;

	function localBlockIndex(x, y, z)
	{
		return (((z << CHUNK_BITS) + y) << CHUNK_BITS) + x;
	}

	function localBlockX(i)
	{
		return (i >> CHUNK_BITS * 0) % CHUNK_WIDTH;
	}

	function localBlockY(i)
	{
		return (i >> CHUNK_BITS * 1) % CHUNK_WIDTH;
	}

	function localBlockZ(i)
	{
		return (i >> CHUNK_BITS * 2) % CHUNK_WIDTH;
	}

	function blockToChunk(c)
	{
		return c >> CHUNK_BITS;
	}

	function localBlock(c)
	{
		return mod(c, CHUNK_WIDTH);
	}

	function localChunkIndex(x, y, z)
	{
		return (((z << WORLD_BITS) + y) << WORLD_BITS) + x;
	}

	const blocks = [
		{
			name: "air",
			solid: false,
			visible: false,
		},
		{
			name: "stone",
			solid: true,
			visible: true,
			tiles: [0, 0, 0, 0, 0, 0],
		},
		{
			name: "soil",
			solid: true,
			visible: true,
			tiles: [1, 1, 1, 1, 1, 1],
		},
		{
			name: "grass",
			solid: true,
			visible: true,
			tiles: [3, 3, 2, 1, 3, 3],
		},
		{
			name: "object",
			solid: true,
			visible: false,
		},
	];

	function getBlockId(block)
	{
		return block & 0xff;
	}

	function getBlockSlope(block)
	{
		return block >> 8 & 0xf;
	}

	function getBlockInfo(id)
	{
		return blocks[id];
	}

	function isSolidBlock(id)
	{
		return getBlockInfo(id).solid;
	}

	function isVisibleBlock(id)
	{
		return getBlockInfo(id).visible;
	}

	function getBlockTile(id, fid)
	{
		return getBlockInfo(id).tiles[fid];
	}

	class ChunkData
	{
		constructor()
		{
			this.data     = [0, 0];
			this.objs     = {};
			this.modified = false;
		}
		
		isUniform()
		{
			return this.data.length === 2;
		}
		
		getUniform()
		{
			return this.isUniform() ? this.data[1] : undefined;
		}
		
		getUniformId()
		{
			return this.isUniform() ? this.data[1] & 0xff: undefined;
		}
		
		getUniformSlope()
		{
			return this.isUniform() ? this.data[1] << 8 & 0xf: undefined;
		}
		
		getBlock(x, y, z)
		{
			return intervalSearch(this.data, localBlockIndex(x, y, z));
		}
		
		getBlockId(x, y, z)
		{
			return this.getBlock(x, y, z) & 0xff;
		}
		
		getBlockSlope(x, y, z)
		{
			return this.getBlock(x, y, z) >> 8 & 0xf;
		}
		
		isModified()
		{
			return this.modified;
		}
		
		forEachBlock(fn)
		{
			intervalForEachBlock(this.data, ({block, i}) => {
				fn({
					block, i,
					id:    getBlockId(block),
					slope: getBlockSlope(block),
					x:     localBlockX(i),
					y:     localBlockY(i),
					z:     localBlockZ(i),
				});
			});
		}
		
		forEachBlockPos(fn)
		{
			for(let z=0, i=0; z < CHUNK_WIDTH; z++) {
				for(let y=0; y < CHUNK_WIDTH; y++) {
					for(let x=0; x < CHUNK_WIDTH; x++, i++) {
						fn({x, y, z, i});
					}
				}
			}
		}
		
		unpackTo(buf)
		{
			intervalForEach(this.data, ({block, start, end}) => {
				buf.fill(block, start, end);
			});
		}
		
		update()
		{
			let modified = this.modified;
			
			this.modified = false;
			
			return modified;
		}
		
		setBlock(x, y, z, id = undefined, sl = undefined, addsl = false)
		{
			intervalPlace(this.data, localBlockIndex(x, y, z), id, sl, addsl);
			this.modified = true;
		}
		
		setBlockSlope(x, y, z, sl)
		{
			this.setBlock(x, y, z, undefined, sl);
		}
		
		addBlockSlope(x, y, z, sl)
		{
			this.setBlock(x, y, z, undefined, sl, true);
		}
		
		packFrom(buf)
		{
			this.data     = [0, 0];
			this.modified = true;
			
			buf.forEach((v, i) => {
				intervalPlace(this.data, i, v);
			});
		}
		
		deserialize(plain)
		{
			this.data     = plain.data;
			this.modified = true;
		}
	}

	function intervalIndex(data, i)
	{
		let p = 0;
		let j = 0;
		let s = 0;
		let e = data.length >> 1;
		
		while(s + 1 < e) {
			p = (s + e) >> 1;
			j = data[p << 1];
			
			if(j > i) {
				e = p;
			}
			else if(j < i) {
				s = p;
			}
			else {
				return p << 1;
			}
		}
		
		return s << 1;
	}

	function intervalSearch(data, i)
	{
		return data[intervalIndex(data, i) + 1];
	}

	function intervalPlace(data, i, id = undefined, sl = undefined, addsl = false)
	{
		let len = data.length;
		let ii  = intervalIndex(data, i);
		let is  = data[ii];
		let iv  = data[ii + 1];
		let iid = iv >> 0 & 0xff;
		let isl = iv >> 8 & 0x0f;
		let csl = (isl | sl) === 0b1111 ? 0 : (isl | sl);
		let vid = id === undefined ? iid : id;
		let vsl = sl === undefined ? isl : addsl ? csl : sl;
		let v   = vid + (vsl << 8);
		let ie  = ii + 2 < len ? data[ii + 2] : CHUNK_SIZE;
		
		// value is new
		if(v !== iv) {
			// index is first in interval
			if(i === is) {
				// index is last in interval (interval has length 1)
				if(is + 1 === ie) {
					// previous interval has the new value
					if(ii > 0 && data[ii - 1] === v) {
						// next interval has the new value (can merge from prev to next interval)
						if(ii + 3 < len && data[ii + 3] === v) {
							data.splice(ii, 4);
						}
						// next interval hasn't the new value (can merge prev with cur interval)
						else {
							data.splice(ii, 2);
						}
					}
					// previous interval hasn't the new value
					else {
						//data.splice(ii + 2, 2);
						data[ii + 1] = v;
					}
				}
				// previous interval has the new value
				else if(ii > 0 && data[ii - 1] === v) {
					data[ii]++;
				}
				else {
					data.splice(ii + 1, 0, v, is + 1);
				}
			}
			else if(i === ie - 1) {
				if(ii + 3 < len && data[ii + 3] === v) {
					data[ii + 2]--;
				}
				else {
					data.splice(ii + 2, 0, i, v);
				}
			}
			else {
				data.splice(ii + 2, 0, i, v, i + 1, iv);
			}
		}
	}

	function intervalForEach(data, fn)
	{
		for(let i=0, i2=2, len = data.length; i < len; i += 2, i2 += 2) {
			fn({
				block: data[i + 1],
				start: data[i],
				end:   i2 < len ? data[i2] : CHUNK_SIZE,
			});
		}
	}

	function intervalForEachBlock(data, fn)
	{
		intervalForEach(data, ({block, start, end}) => {
			for(let i = start; i < end; i++) {
				fn({block, i});
			}
		});
	}

	class VertexLayout
	{
		constructor(type, ...fields)
		{
			this.type   = type;
			this.fields = {};
			this.names  = [];
			this.stride = 0;
			this.size   = 0;
			
			this.datasize = {
				byte:   1,
				ubyte:  1,
				short:  2,
				ushort: 2,
				float:  4,
			}[type];
			
			this.arraytype = {
				byte:   Int8Array,
				ubyte:  Uint8Array,
				short:  Int16Array,
				ushort: Uint16Array,
				float:  Float32Array,
			}[type];
			
			fields.forEach(field => {
				this.fields[field[0]] = {
					size:   field[1],
					offset: this.stride,
				};
				
				this.names.push(field[0]);
				this.size += field[1];
				this.stride += this.datasize * field[1];
			});
		}
		
		getType()
		{
			return this.type;
		}
		
		getArrayType()
		{
			return this.arraytype;
		}
		
		getDataSize()
		{
			return this.datasize;
		}
		
		getNames()
		{
			return this.names;
		}
		
		getStride()
		{
			return this.stride;
		}
		
		getSize()
		{
			return this.size;
		}
		
		getFieldSize(field)
		{
			return this.fields[field].size;
		}
		
		getOffset(field)
		{
			return this.fields[field].offset;
		}
	}

	function create(x = 0, y = 0, z = 0, out = new Float32Array(3))
	{
		out[0] = x;
		out[1] = y;
		out[2] = z;
		
		return out;
	}

	function create64(x = 0, y = 0, z = 0, out = new Float64Array(3))
	{
		out[0] = x;
		out[1] = y;
		out[2] = z;
		
		return out;
	}

	function copy(src, out = new Float32Array(3))
	{
		out[0] = src[0];
		out[1] = src[1];
		out[2] = src[2];
		
		return out;
	}

	function scale(v, s, out = new Float32Array(3))
	{
		out[0] = v[0] * s;
		out[1] = v[1] * s;
		out[2] = v[2] * s;
		
		return out;
	}

	function rotateX(v, a, out = new Float32Array(3))
	{
		let s = Math.sin(a);
		let c = Math.cos(a);
		
		return create(
			v[0],
			v[1] * c - v[2] * s,
			v[1] * s + v[2] * c,
			out,
		);
	}

	function rotateY(v, a, out = new Float32Array(3))
	{
		let s = Math.sin(a);
		let c = Math.cos(a);
		
		return create(
			v[0] * c - v[2] * s,
			v[1],
			v[0] * s + v[2] * c,
			out,
		);
	}

	function rotateZ(v, a, out = new Float32Array(3))
	{
		let s = Math.sin(a);
		let c = Math.cos(a);
		
		return create(
			v[0] * c - v[1] * s,
			v[0] * s + v[1] * c,
			v[2],
			out,
		);
	}

	class ChunkMesh extends ChunkData
	{
		constructor()
		{
			super();
			
			this.verts   = new Uint8Array(0);
			this.vertnum = 0;
		}
		
		getVerts()
		{
			return this.verts;
		}
		
		getVertNum()
		{
			return this.vertnum;
		}
		
		update(getChunkVicinity, x, y, z, fn)
		{
			if(super.update()) {
				if(this.isUniform() && !isVisibleBlock(this.getUniform())) {
					this.verts   = new Uint8Array(0);
					this.vertnum = 0;
				}
				else {
					createMesh(getChunkVicinity(x, y, z), (verts, vertnum) => {
						this.verts   = verts;
						this.vertnum = vertnum;
						fn();
					});
				}
			}
		}
	}

	let CHUNK_VERT_LAYOUT = new VertexLayout(
		"ubyte", ["vert", 3], ["occl", 1], ["normal", 3], ["tile", 1]
	);

	let dataCacheMatrix = null;
	let dataBufMatrix   = null;
	let worker          = null;
	let nextCbId        = null;
	let callbacks       = undefined;

	if(typeof window === "object") {
		dataCacheMatrix = [
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
			
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
			
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
			new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		];

		dataBufMatrix = dataCacheMatrix.map(x => x.buffer);
		worker        = new Worker("./bundles/mesher.js");
		nextCbId      = 0;
		callbacks     = {};

		worker.onmessage = e => {
			let fn = callbacks[e.data.cbId];
			
			delete callbacks[e.data.cbId];
			
			fn(e.data.verts, e.data.vertnum);
		};
	}

	function createMesh(chunkVicinity, fn)
	{
		let cbId = nextCbId++; 
		
		callbacks[cbId] = fn;
		
		unpackChunkData(chunkVicinity);
		worker.postMessage({dcm: dataCacheMatrix, cbId: cbId});//, dataBufMatrix);
	}

	function unpackChunkData(chunkVicinity)
	{
		for(let i = 0; i < 27; i++) {
			chunkVicinity[i].unpackTo(dataCacheMatrix[i]);
		}
	}

	/*
	let VERT_SIZE = CHUNK_VERT_LAYOUT.getSize();
	let QUAD_SIZE = 2 * 3 * VERT_SIZE;

	let dataCacheMatrix = [
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
		new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE), new Uint16Array(CHUNK_SIZE),
	];

	let i = vector.create();
	let j = vector.create();
	let q = vector.create();
	let r = vector.create();
	let n = vector.create();

	let rightFaces  = new Uint32Array(CHUNK_SIZE);
	let leftFaces   = new Uint32Array(CHUNK_SIZE);
	let topFaces    = new Uint32Array(CHUNK_SIZE);
	let bottomFaces = new Uint32Array(CHUNK_SIZE);
	let backFaces   = new Uint32Array(CHUNK_SIZE);
	let frontFaces  = new Uint32Array(CHUNK_SIZE);

	let meshVerts     = new Uint8Array(CHUNK_SIZE * 6 * QUAD_SIZE);
	let meshVertCount = 0;

	function createMesh(cdm)
	{
		unpackChunkData(cdm);
		computeFaces();
		mergeFaces();
		
		return new Uint8Array(meshVerts.subarray(0, meshVertCount * VERT_SIZE));
	}

	function getBlockId(block)
	{
		return block & 0xff;
	}

	function getBlockSlope(block)
	{
		return block >> 8 & 0xf;
	}

	function getLastVertNum()
	{
		return meshVertCount;
	}

	function getDataCache(x, y, z)
	{
		return dataCacheMatrix[x + 1 + 3 * (y + 1) + 9 * (z + 1)];
	}

	function getCachedBlockId(x, y, z)
	{
		return getBlockId(getCachedBlock(x, y, z));
	}

	function isOccluding(block)
	{
		return isSolidBlock(block & 0xff) && (block >> 8 & 0xf) === 0;
	}

	function getSlopeNormalPattern(sl)
	{
		switch(sl) {
			case 0b0000:
				return [0,0, 0,0, 0,0, 0,0]
			case 0b0001:
				return [1,1, 1,0, 0,1, 1,1];
			case 0b0010:
				return [-1,1, -1,1, -1,1, 0,1];
			case 0b0011:
				return [0,1, 0,1, 0,1, 0,1];
			case 0b0100:
				return [0,-1, 1-1, 1-1, 1, 0];
			case 0b0101:
				return [1,0, 1,0, 1,0, 1,0];
			case 0b0110:
				return [-1,-1,  0,0, 0,0, 1,1];
			case 0b0111:
				return [ 1,1,  0,1, 1,0,  1,1];
			case 0b1000:
				return [-1,-1, 0,-1, -1,0, -1,-1];
			case 0b1001:
				return [0,0, 1,-1, -1,1, 0,0];
			case 0b1010:
				return [-1,0, -1,0, -1,0, -1,0];
			case 0b1011:
				return [ 0,1, -1,1, -1,1, -1,0];
			case 0b1100:
				return [ 0,-1, 0,-1, 0,-1, 0,-1];
			case 0b1101:
				return [ 1,0, 1,-1, 1,-1, 0,-1];
			case 0b1110:
				return [-1,-1, -1,0,  0,-1, -1,-1];
			case 0b1111:
				return [0,0, 0,0, 0,0, 0,0];
		}
	}

	function getCachedBlock(x, y, z)
	{
		let cx = 0;
		let cy = 0;
		let cz = 0;
		
		if(x < 0) {
			cx--;
			x += CHUNK_WIDTH;
		}
		else if(x >= CHUNK_WIDTH) {
			cx++;
			x -= CHUNK_WIDTH;
		}
		
		if(y < 0) {
			cy--;
			y += CHUNK_WIDTH;
		}
		else if(y >= CHUNK_WIDTH) {
			cy++;
			y -= CHUNK_WIDTH;
		}
		
		if(z < 0) {
			cz--;
			z += CHUNK_WIDTH;
		}
		else if(z >= CHUNK_WIDTH) {
			cz++;
			z -= CHUNK_WIDTH;
		}
		
		let dataCache = getDataCache(cx, cy, cz);
		
		return dataCache[localBlockIndex(x, y, z)];
	}

	function getVertOcclusion(side0, side1, corner)
	{
		return side0 && side1 ? 3 : side0 + side1 + corner;
	}

	function unpackChunkData(chunkVicinity)
	{
		for(let i = 0; i < 27; i++) {
			chunkVicinity[i].unpackTo(dataCacheMatrix[i]);
		}
	}

	function computeFaces()
	{
		let dataCache = getDataCache(0, 0, 0);
		
		for(let z = 0, i = 0; z < CHUNK_WIDTH; z++) {
			for(let y = 0; y < CHUNK_WIDTH; y++) {
				for(let x = 0; x < CHUNK_WIDTH; x++, i++) {
					let block = dataCache[i];
					let id    = getBlockId(block);
					let slope = getBlockSlope(block);
					
					rightFaces[i]  = 0;
					leftFaces[i]   = 0;
					topFaces[i]    = 0;
					bottomFaces[i] = 0;
					backFaces[i]   = 0;
					frontFaces[i]  = 0;
					
					if(isSolidBlock(id)) {
						if(slope === 0) {
							computeFace(x, y, z, +1, 0, 0, id, 0, rightFaces);
							computeFace(x, y, z, -1, 0, 0, id, 1, leftFaces);
							computeFace(x, y, z,  0,+1, 0, id, 2, topFaces);
							computeFace(x, y, z,  0,-1, 0, id, 3, bottomFaces);
							computeFace(x, y, z,  0, 0,+1, id, 4, backFaces);
							computeFace(x, y, z,  0, 0,-1, id, 5, frontFaces)
						}
						else {
							let occl    = computeFaceOcclusion(x, y, z, 0, 1, 0);
							topFaces[i] = createFaceInfo(getBlockTile(id, 2), ...occl, slope, 1);
						}
					}
				}
			}
		}
	}

	function computeFaceOcclusion(x, y, z, nx, ny, nz)
	{
		let right   = false;
		let left    = false;
		let top     = false;
		let bottom  = false;
		let rtc     = false;
		let ltc     = false;
		let rbc     = false;
		let lbc     = false;
		let occl0   = 0;
		let occl1   = 0;
		let occl2   = 0;
		let occl3   = 0;

		if(nx > 0) {
			right  = isOccluding(getCachedBlock(x + 1, y,     z + 1));
			left   = isOccluding(getCachedBlock(x + 1, y,     z - 1));
			top    = isOccluding(getCachedBlock(x + 1, y + 1, z));
			bottom = isOccluding(getCachedBlock(x + 1, y - 1, z));
			rtc    = isOccluding(getCachedBlock(x + 1, y + 1, z + 1));
			ltc    = isOccluding(getCachedBlock(x + 1, y + 1, z - 1));
			rbc    = isOccluding(getCachedBlock(x + 1, y - 1, z + 1));
			lbc    = isOccluding(getCachedBlock(x + 1, y - 1, z - 1));
		}
		else if(nx < 0) {
			right  = isOccluding(getCachedBlock(x - 1, y,     z - 1));
			left   = isOccluding(getCachedBlock(x - 1, y,     z + 1));
			top    = isOccluding(getCachedBlock(x - 1, y + 1, z));
			bottom = isOccluding(getCachedBlock(x - 1, y - 1, z));
			rtc    = isOccluding(getCachedBlock(x - 1, y + 1, z - 1));
			ltc    = isOccluding(getCachedBlock(x - 1, y + 1, z + 1));
			rbc    = isOccluding(getCachedBlock(x - 1, y - 1, z - 1));
			lbc    = isOccluding(getCachedBlock(x - 1, y - 1, z + 1));
		}
		else if(ny > 0) {
			right  = isOccluding(getCachedBlock(x + 1, y + 1, z));
			left   = isOccluding(getCachedBlock(x - 1, y + 1, z));
			top    = isOccluding(getCachedBlock(x,     y + 1, z + 1));
			bottom = isOccluding(getCachedBlock(x,     y + 1, z - 1));
			rtc    = isOccluding(getCachedBlock(x + 1, y + 1, z + 1));
			ltc    = isOccluding(getCachedBlock(x - 1, y + 1, z + 1));
			rbc    = isOccluding(getCachedBlock(x + 1, y + 1, z - 1));
			lbc    = isOccluding(getCachedBlock(x - 1, y + 1, z - 1));
		}
		else if(ny < 0) {
			right  = isOccluding(getCachedBlock(x + 1, y - 1, z));
			left   = isOccluding(getCachedBlock(x - 1, y - 1, z));
			top    = isOccluding(getCachedBlock(x,     y - 1, z - 1));
			bottom = isOccluding(getCachedBlock(x,     y - 1, z + 1));
			rtc    = isOccluding(getCachedBlock(x + 1, y - 1, z - 1));
			ltc    = isOccluding(getCachedBlock(x - 1, y - 1, z - 1));
			rbc    = isOccluding(getCachedBlock(x + 1, y - 1, z + 1));
			lbc    = isOccluding(getCachedBlock(x - 1, y - 1, z + 1));
		}
		else if(nz > 0) {
			right  = isOccluding(getCachedBlock(x - 1, y,     z + 1));
			left   = isOccluding(getCachedBlock(x + 1, y,     z + 1));
			top    = isOccluding(getCachedBlock(x,     y + 1, z + 1));
			bottom = isOccluding(getCachedBlock(x,     y - 1, z + 1));
			rtc    = isOccluding(getCachedBlock(x - 1, y + 1, z + 1));
			ltc    = isOccluding(getCachedBlock(x + 1, y + 1, z + 1));
			rbc    = isOccluding(getCachedBlock(x - 1, y - 1, z + 1));
			lbc    = isOccluding(getCachedBlock(x + 1, y - 1, z + 1));
		}
		else if(nz < 0) {
			right  = isOccluding(getCachedBlock(x + 1, y,     z - 1));
			left   = isOccluding(getCachedBlock(x - 1, y,     z - 1));
			top    = isOccluding(getCachedBlock(x,     y + 1, z - 1));
			bottom = isOccluding(getCachedBlock(x,     y - 1, z - 1));
			rtc    = isOccluding(getCachedBlock(x + 1, y + 1, z - 1));
			ltc    = isOccluding(getCachedBlock(x - 1, y + 1, z - 1));
			rbc    = isOccluding(getCachedBlock(x + 1, y - 1, z - 1));
			lbc    = isOccluding(getCachedBlock(x - 1, y - 1, z - 1));
		}
		
		occl0 = getVertOcclusion(left,  bottom, lbc);
		occl1 = getVertOcclusion(right, bottom, rbc);
		occl2 = getVertOcclusion(left,  top,    ltc);
		occl3 = getVertOcclusion(right, top,    rtc);
		
		return [occl0, occl1, occl2, occl3];
	}

	function computeFace(x, y, z, nx, ny, nz, id, fid, targetFaces)
	{
		let tile    = 0;
		let visible = 0;
		let occl    = [0,0,0,0];
		
		if(!isOccluding(getCachedBlock(x + nx, y + ny, z + nz))) {
			tile    = getBlockTile(id, fid);
			visible = 1;
			occl    = computeFaceOcclusion(x, y, z, nx, ny, nz);
		}
		
		targetFaces[localBlockIndex(x, y, z)] = (
			createFaceInfo(tile, ...occl, 0, visible)
		);
	}

	function createFaceInfo(tile, occl0, occl1, occl2, occl3, slope, visible)
	{
		return (
			tile | occl0 << 8 | occl1 << 10 | occl2 << 12 | occl3 << 14 | slope << 16 | visible << 20
		);
	}

	function extractFaceInfo(face)
	{
		return {
			tile:    face >>  0 & 0xff,
			occl0:   face >>  8 & 0x03,
			occl1:   face >> 10 & 0x03,
			occl2:   face >> 12 & 0x03,
			occl3:   face >> 14 & 0x03,
			slope:   face >> 16 & 0x0f,
			visible: face >> 20 & 0x01,
		};
	}

	function mergeFaces()
	{
		meshVertCount = 0;
		
		mergeFacesSide(rightFaces,  2,1,0, +1, 0, 0, false,false,false);
		mergeFacesSide(leftFaces,   2,1,0, -1, 0, 0, false,false,true);
		mergeFacesSide(topFaces,    0,2,1,  0,+1, 0, false,false,false);
		mergeFacesSide(bottomFaces, 0,2,1,  0,-1, 0, false,false,true);
		mergeFacesSide(backFaces,   0,1,2,  0, 0,+1, true, false,false);
		mergeFacesSide(frontFaces,  0,1,2,  0, 0,-1, false,false,false);
	}

	function mergeFacesSide(targetFaces, ax0,ax1,ax2, nx,ny,nz, fx,fy,fz)
	{
		let a = [fx ? CHUNK_WIDTH-1 : 0, fy ? CHUNK_WIDTH-1 : 0, fz ? CHUNK_WIDTH-1 : 0];
		let b = [fx ? -1 : CHUNK_WIDTH,  fy ? -1 : CHUNK_WIDTH,  fz ? -1 : CHUNK_WIDTH];
		let s = [fx ? -1 : +1,           fy ? -1 : +1,           fz ? -1 : +1];
		
		let index = 0;
		let first = 0;
		let exti  = 0;
		let spanx = 1;
		let spany = 1;
		let flip  = false;
		let info  = null;
		let slope = 0;
		
		vector.create(0, 0, 0, i);
		vector.create(0, 0, 0, j);
		vector.create(nx, ny, nz, n);
		
		for(         i[ax2] = a[ax2]; i[ax2] !== b[ax2]; i[ax2] += s[ax2] ) {
			for(     i[ax1] = a[ax1]; i[ax1] !== b[ax1]; i[ax1] += s[ax1] ) {
				for( i[ax0] = a[ax0]; i[ax0] !== b[ax0]; i[ax0] += s[ax0] ) {
				
					index = localBlockIndex(...i);
					first = targetFaces[index];
					info  = extractFaceInfo(first);
					
					if(first) {
						j.set(i);
						
						for(spanx = 1; i[ax0] + spanx * s[ax0] !== b[ax0]; spanx++) {
							j[ax0] = i[ax0] + spanx * s[ax0];
							exti   = localBlockIndex(...j);
							
							if(targetFaces[exti] !== first) {
								break;
							}
							
							targetFaces[exti] = 0;
						}
						
						outer:
						for(spany = 1; i[ax1] + spany * s[ax1] !== b[ax1]; spany++) {
							j[ax1] = i[ax1] + spany * s[ax1];
							
							for(let k = 0; k !== spanx * s[ax0]; k += s[ax0]) {
								j[ax0] = i[ax0] + k;
								
								if(targetFaces[localBlockIndex(...j)] !== first) {
									break outer;
								}
							}
							
							for(let k = 0; k !== spanx * s[ax0]; k += s[ax0]) {
								j[ax0] = i[ax0] + k;
								
								targetFaces[localBlockIndex(...j)] = 0;
							}
						}
						
						j[ax0] = i[ax0] + (s[ax0] < 0);
						j[ax1] = i[ax1] + (s[ax1] < 0);
						j[ax2] = i[ax2] + (n[ax2] > 0);
						
						q[ax0] = j[ax0] + s[ax0] * spanx;
						q[ax1] = j[ax1] + s[ax1] * spany;
						q[ax2] = j[ax2];
						
						slope = info.slope;
						
						if(slope > 0) {
							flip = slope === 0b0001 || slope === 0b1000 || slope === 0b1110;
							addSlopeQuad(j, q, info.tile, slope, flip, info.occl0,info.occl1,info.occl2,info.occl3);
						}
						else {
							flip = info.occl0 + info.occl3 < info.occl1 + info.occl2;
							addQuad(
								j, q, ax0,ax1,
								info.occl0,info.occl1,info.occl2,info.occl3,
								nx,ny,nz, info.tile, flip
							);
						}
					}
				}
			}
		}
	}

	function arrayCopyInside(buf, to, from, len)
	{
		buf.set(buf.subarray(from, from + len), to);
	}

	function addSlopeQuad(p, q, tile, slope, flip, oc0,oc1,oc2,oc3)
	{
		let i = meshVertCount * VERT_SIZE;
		let s = i;
		let nx = 0;
		let ny = 2 * 64;
		let nz = 0;
		let slope00 = slope >> 0 & 1;
		let slope10 = slope >> 1 & 1;
		let slope01 = slope >> 2 & 1;
		let slope11 = slope >> 3 & 1;
		let pattern = getSlopeNormalPattern(slope);
		
		nx = pattern[0];
		nz = pattern[1];
		nx = (nx + 1) * 64;
		nz = (nz + 1) * 64;
		
		r.set(p);
		r[1] -= 1 - slope00;
		meshVerts.set(r, i);
		meshVerts[i + 3] = oc0;
		meshVerts[i + 4] = nx;
		meshVerts[i + 5] = ny;
		meshVerts[i + 6] = nz;
		meshVerts[i + 7] = tile;
		
		nx = pattern[2];
		nz = pattern[3];
		nx = (nx + 1) * 64;
		nz = (nz + 1) * 64;
		
		i += VERT_SIZE;
		r.set(p);
		r[0] = q[0];
		r[1] -= 1 - slope10;
		meshVerts.set(r, i);
		meshVerts[i + 3] = oc1;
		meshVerts[i + 4] = nx;
		meshVerts[i + 5] = ny;
		meshVerts[i + 6] = nz;
		meshVerts[i + 7] = tile;
		
		nx = pattern[4];
		nz = pattern[5];
		nx = (nx + 1) * 64;
		nz = (nz + 1) * 64;
		
		i += VERT_SIZE;
		r.set(p);
		r[1] -= 1 - slope01;
		r[2] = q[2];
		meshVerts.set(r, i);
		meshVerts[i + 3] = oc2;
		meshVerts[i + 4] = nx;
		meshVerts[i + 5] = ny;
		meshVerts[i + 6] = nz;
		meshVerts[i + 7] = tile;
		
		i += VERT_SIZE;
		arrayCopyInside(meshVerts, i, i - VERT_SIZE * 1, VERT_SIZE);
		
		i += VERT_SIZE;
		arrayCopyInside(meshVerts, i, i - VERT_SIZE * 3, VERT_SIZE);
		
		nx = pattern[6];
		nz = pattern[7];
		nx = (nx + 1) * 64;
		nz = (nz + 1) * 64;
		
		i += VERT_SIZE;
		r.set(q);
		r[1] -= 1 - slope11;
		meshVerts.set(r, i);
		meshVerts[i + 3] = oc3;
		meshVerts[i + 4] = nx;
		meshVerts[i + 5] = ny + 1;
		meshVerts[i + 6] = nz;
		meshVerts[i + 7] = tile;
		
		if(flip) {
			arrayCopyInside(meshVerts, s + VERT_SIZE * 2, s + VERT_SIZE * 5, VERT_SIZE);
			arrayCopyInside(meshVerts, s + VERT_SIZE * 4, s + VERT_SIZE * 0, VERT_SIZE); 
		}
		
		meshVertCount += 6;
	}

	function addQuad(p, q, ax0,ax1, oc0,oc1,oc2,oc3, nx,ny,nz, tile, flip)
	{
		let i = meshVertCount * VERT_SIZE;
		let s = i;
		
		nx = (nx + 1) * 64;
		ny = (ny + 1) * 64;
		nz = (nz + 1) * 64;
		
		meshVerts.set(p, i);
		meshVerts[i + 3] = oc0;
		meshVerts[i + 4] = nx;
		meshVerts[i + 5] = ny;
		meshVerts[i + 6] = nz;
		meshVerts[i + 7] = tile;
		
		i += VERT_SIZE;
		r.set(p);
		r[ax0] = q[ax0];
		meshVerts.set(r, i);
		meshVerts[i + 3] = oc1;
		meshVerts[i + 4] = nx;
		meshVerts[i + 5] = ny;
		meshVerts[i + 6] = nz;
		meshVerts[i + 7] = tile;
		
		i += VERT_SIZE;
		r.set(p);
		r[ax1] = q[ax1];
		meshVerts.set(r, i);
		meshVerts[i + 3] = oc2;
		meshVerts[i + 4] = nx;
		meshVerts[i + 5] = ny;
		meshVerts[i + 6] = nz;
		meshVerts[i + 7] = tile;
		
		i += VERT_SIZE;
		arrayCopyInside(meshVerts, i, i - VERT_SIZE * 1, VERT_SIZE);
		
		i += VERT_SIZE;
		arrayCopyInside(meshVerts, i, i - VERT_SIZE * 3, VERT_SIZE);
		
		i += VERT_SIZE;
		meshVerts.set(q, i);
		meshVerts[i + 3] = oc3;
		meshVerts[i + 4] = nx;
		meshVerts[i + 5] = ny;
		meshVerts[i + 6] = nz;
		meshVerts[i + 7] = tile;
		
		if(flip) {
			arrayCopyInside(meshVerts, s + VERT_SIZE * 2, s + VERT_SIZE * 5, VERT_SIZE);
			arrayCopyInside(meshVerts, s + VERT_SIZE * 4, s + VERT_SIZE * 0, VERT_SIZE); 
		}
		
		meshVertCount += 6;
	}
	*/

	class ChunkDrawable extends ChunkMesh
	{
		constructor(display)
		{
			super(display);
			
			this.display = display;
			
			if(display) {
				this.buf    = display.Buffer("dynamic", CHUNK_VERT_LAYOUT);
				this.shader = display.getShader("chunk", vertSrc, fragSrc);
				this.atlas  = display.getTexture("gfx/atlas.png");
			}
		}
		
		update(getChunkVicinity, x, y, z)
		{
			super.update(getChunkVicinity, x, y, z, () => {
				if(this.display) {
					this.buf.update(this.getVerts());
				}
			});
		}
		
		draw(pos, camera, sun)
		{
			if(this.display && this.buf.getSize() > 0) {
				let shader = this.shader;
				let buf    = this.buf;
				let gl     = this.display.gl;
				
				shader.use();
				shader.uniform("sun",       sun);
				shader.uniform("campos",    camera.pos);
				shader.uniform("proj",      camera.getProjection());
				shader.uniform("viewModel", camera.getViewModel(pos));
				shader.texture("atlas",     this.atlas);
				shader.buffer(buf);
				shader.triangles();
			}
		}
	}

	const vertSrc = `
	uniform vec3 sun;
	uniform mat4 proj;
	uniform mat4 viewModel;
	uniform vec3 campos;
	
	attribute vec3 vert;
	attribute vec3 normal;
	attribute float tile;
	attribute float occl;
	
	varying vec3 vTranslatedVert;
	varying vec2 uvOffset;
	varying vec2 planePos;
	varying float coef;
	
	void main()
	{
		vec3 correctVert = vert;
		vec3 correctNormal = normalize(normal / 64.0 - vec3(1.0));
		vec4 translatedVert = viewModel * vec4(correctVert, 1.0);
		
		gl_Position = proj * translatedVert;
		
		uvOffset = vec2(mod(tile, 16.0), floor(tile / 16.0));
		planePos = vec2(0.0);
		
		vTranslatedVert = translatedVert.xyz;
		
		coef = (
			0.5 * (1.0 - occl * 0.25) +
			0.5 * max(0.0, dot(correctNormal, -sun))
		);
		
		if(correctNormal.y > 0.125) {
			planePos = vec2( 0.0 + correctVert.x, 16.0 - correctVert.z);
		}
		else if(correctNormal.y < -0.125) {
			planePos = vec2( 0.0 + correctVert.x,  0.0 + correctVert.z);
		}
		else if(correctNormal.x > 0.125) {
			planePos = vec2( 0.0 + correctVert.z, 16.0 - correctVert.y);
		}
		else if(correctNormal.x < -0.125) {
			planePos = vec2(16.0 - correctVert.z, 16.0 - correctVert.y);
		}
		else if(correctNormal.z > 0.125) {
			planePos = vec2(16.0 - correctVert.x, 16.0 - correctVert.y);
		}
		else if(correctNormal.z < -0.125) {
			planePos = vec2( 0.0 + correctVert.x, 16.0 - correctVert.y);
		}
	}
`;

	const fragSrc = `
	uniform sampler2D atlas;
	uniform vec3 sun;
	
	varying vec3 vTranslatedVert;
	varying vec2 uvOffset;
	varying vec2 planePos;
	varying float coef;
	
	void main()
	{
		float fog = min(1.0, 16.0 / length(vTranslatedVert));
		
		vec2 uv = (uvOffset + fract(planePos)) / 16.0;
		
		gl_FragColor      = texture2D(atlas, uv);
		gl_FragColor.rgb *= coef;
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * vec3(0.75, 0.875, 1.0) * max(0.0, -sun.y);
	}
`;

	let sqrt  = Math.sqrt;
	let floor$1 = Math.floor;
	let ceil  = Math.ceil;
	let abs$1   = Math.abs;

	let dir      = create64();
	let lead     = create64();
	let voxpos   = create64();
	let leadvox  = create64();
	let trailvox = create64();
	let step     = create64();
	let waydelta = create64();
	let waynext  = create64();

	function boxcast(boxmin, boxmax, vec, getvox, getslope)
	{
		let len      = sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
		let way      = 0;
		let axis     = 0;
		let distnext = 0;
		let trail    = 0;
		
		if(len === 0) {
			return;
		}
		
		for(let k = 0; k < 3; k ++) {
			dir[k]      = vec[k] / len;
			waydelta[k] = abs$1(1 / dir[k]);
			
			if(dir[k] > 0) {
				step[k]     = 1;
				lead[k]     = boxmax[k];
				trail       = boxmin[k];
				leadvox[k]  = ceil(lead[k]) - 1;
				trailvox[k] = floor$1(trail);
				distnext    = ceil(lead[k]) - lead[k];
			}
			else {
				step[k]     = -1;
				lead[k]     = boxmin[k];
				trail       = boxmax[k];
				leadvox[k]  = floor$1(lead[k]);
				trailvox[k] = ceil(trail) - 1;
				distnext    = lead[k] - floor$1(lead[k]);
			}
			
			if(waydelta[k] === Infinity) {
				waynext[k] = Infinity;
			}
			else {
				waynext[k] = waydelta[k] * distnext;
			}
		}
		
		while(way <= len) {
			if(waynext[0] < waynext[1] && waynext[0] < waynext[2]) {
				axis = 0;
			}
			else if(waynext[1] < waynext[2]) {
				axis = 1;
			}
			else {
				axis = 2;
			}
			
			way             = waynext[axis];
			waynext[axis]  += waydelta[axis];
			leadvox[axis]  += step[axis];
			trailvox[axis] += step[axis];
			
			if(way <= len) {
				let stepx = step[0];
				let stepy = step[1];
				let stepz = step[2];
				let xs = axis === 0 ? leadvox[0] : trailvox[0];
				let ys = axis === 1 ? leadvox[1] : trailvox[1];
				let zs = axis === 2 ? leadvox[2] : trailvox[2];
				let xe = leadvox[0] + stepx;
				let ye = leadvox[1] + stepy;
				let ze = leadvox[2] + stepz;

				for(let x = xs; x !== xe; x += stepx) {
					for(let y = ys; y !== ye; y += stepy) {
						for(let z = zs; z !== ze; z += stepz) {
							voxpos[0] = x;
							voxpos[1] = y;
							voxpos[2] = z;
							
							if(getvox(...voxpos) && getslope(...voxpos) === 0) {
								return {
									axis:   axis,
									step:   step[axis],
									pos:    lead[axis] + way * dir[axis],
									voxpos: voxpos,
								};
							}
						}
					}
				}
			}
		}
	}

	class Sun
	{
		constructor(speed = 1, angle = 0)
		{
			this.speed  = speed;
			this.angle  = angle;
			this.phase  = 0;
			this.dir    = create(0,  1, 0);
			this.raydir = create(0, -1, 0);
		}
		
		update(delta)
		{
			this.phase += delta * this.speed;
			create(0, 1, 0, this.dir);
			rotateZ(this.dir, radians(this.phase), this.dir);
			rotateX(this.dir, radians(this.angle), this.dir);
			rotateY(this.dir, radians(45), this.dir);
		}
		
		getSkyDir()
		{
			return this.dir;
		}
		
		getRayDir()
		{
			return scale(this.dir, -1, this.raydir);
		}
	}

	class Skybox
	{
		constructor(display, sun)
		{
			this.display = display;
			this.sun     = sun;
			this.shader  = display.getShader("skybox", vertSrc$1, fragSrc$1);
			this.buffer  = display.Buffer("static", layout, box);
		}
		
		draw(camera)
		{
			let gl     = this.display.gl;
			let shader = this.shader;
			
			gl.disable(gl.CULL_FACE);
			
			shader.use();
			shader.uniform("mat", camera.getMatrix(camera.pos));
			shader.uniform("sun", this.sun.getSkyDir());
			shader.buffer(this.buffer);
			shader.triangles();
			
			gl.enable(gl.CULL_FACE);
			gl.clear(gl.DEPTH_BUFFER_BIT);
		}
	}

	let layout = new VertexLayout("float", ["pos", 3]);

	let box = [
		-.5,-.5,-.5,
		+.5,-.5,-.5,
		-.5,+.5,-.5,
		-.5,+.5,-.5,
		+.5,-.5,-.5,
		+.5,+.5,-.5,
		
		-.5,-.5,+.5,
		+.5,-.5,+.5,
		-.5,+.5,+.5,
		-.5,+.5,+.5,
		+.5,-.5,+.5,
		+.5,+.5,+.5,
		
		-.5,-.5,+.5,
		-.5,-.5,-.5,
		-.5,+.5,+.5,
		-.5,+.5,+.5,
		-.5,-.5,-.5,
		-.5,+.5,-.5,
		
		+.5,-.5,+.5,
		+.5,-.5,-.5,
		+.5,+.5,+.5,
		+.5,+.5,+.5,
		+.5,-.5,-.5,
		+.5,+.5,-.5,
		
		-.5,+.5,-.5,
		+.5,+.5,-.5,
		-.5,+.5,+.5,
		-.5,+.5,+.5,
		+.5,+.5,-.5,
		+.5,+.5,+.5,
		
		-.5,-.5,-.5,
		+.5,-.5,-.5,
		-.5,-.5,+.5,
		-.5,-.5,+.5,
		+.5,-.5,-.5,
		+.5,-.5,+.5,
	];

	let vertSrc$1 = `
	uniform mat4 mat;
	
	attribute vec3 pos;
	
	varying vec3 vPos;
	
	void main()
	{
		gl_Position = mat * vec4(pos, 1.0);
		vPos        = pos;
	}
`;

	let fragSrc$1 = `
	uniform sampler2D tex;
	uniform vec3 sun;
	
	varying vec3 vPos;
	
	void main()
	{
		gl_FragColor.a = 1.0;
		
		vec3  norm  = normalize(vPos);
		float coef = 1.0 - norm.y;
		
		coef *= coef * 2.0;
		
		gl_FragColor.rgb = mix(
			vec3(0.125, 0.25, 0.5),
			vec3(0.5, 0.75, 1.0),
			coef
		);
		
		gl_FragColor.rgb = mix(
			vec3(0.0, 0.0, 0.125),
			gl_FragColor.rgb,
			max(0.0, sun.y)
		);
		
		float dist = distance(norm, sun);
		
		/*if(dist < 0.125) {
			gl_FragColor.rgb = mix(
				pow(vec3(1.0, 0.75, 0.5), vec3(0.5)),
				gl_FragColor.rgb,
				dist
			);
		}*/
		
		if(dist < 0.5) {
			gl_FragColor.rgb += vec3(1.0, 0.75, 0.5) / (256.0 * pow(dist, 2.0));
		}
	}
`;

	class Ground
	{
		constructor(display, sun)
		{
			this.display = display;
			this.sun     = sun;
			this.tex     = display.getTexture("gfx/atlas.png");
			this.buf     = display.Buffer("static", vertLayout, verts);
			this.shader  = display.getShader("ground", vertSrc$2, fragSrc$2);
		}
		
		draw(camera, sun, pos)
		{
			let gl     = this.display.gl;
			let shader = this.shader;
			
			gl.disable(gl.CULL_FACE);
			shader.use();
			shader.texture("tex",     this.tex);
			shader.uniform("proj",    camera.getProjection());
			shader.uniform("view",    camera.getView());
			shader.uniform("model",   camera.getModel([camera.pos[0], 0, camera.pos[2]]));
			shader.uniform("sun",     this.sun.getRayDir());
			shader.uniform("diff",    0.5);
			shader.uniform("fogCol",  [0.75, 0.875, 1.0]);
			shader.uniform("fogDist", 16);
			shader.buffer(this.buf);
			shader.triangles();
			gl.enable(gl.CULL_FACE);
		}
	}

	const vertLayout = new VertexLayout("float", ["pos", 2]);

	const f = 2048;

	const verts = [
		-f,-f,
		+f,-f,
		-f,+f,
		-f,+f,
		+f,-f,
		+f,+f,
	];

	const vertSrc$2 = `
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 model;
	uniform vec3 sun;
	uniform float diff;
	
	attribute vec2 pos;
	
	varying vec4 vMpos;
	varying vec4 vTransPos;
	varying vec3 vPos;
	varying vec2 vUvOffset;
	varying vec2 vPlanePos;
	varying float vCoef;
	
	void main()
	{
		float tile   = 2.0;
		float height = 1.0 - 1.0 / 256.0;
		
		vPos        = vec3(pos.x, height, pos.y);
		vMpos       = model * vec4(vPos, 1.0);
		vTransPos   = view * vMpos;
		gl_Position = proj * vTransPos;
		vUvOffset   = vec2(mod(tile, 16.0), floor(tile / 16.0));
		vPlanePos   = vec2(0.0 + vMpos.x, 0.0 - vMpos.z);
		vCoef       = (1.0 - diff) + diff * max(0.0, dot(vec3(0,1,0), -sun));
	}
`;

	const fragSrc$2 = `
	uniform sampler2D atlas;
	uniform vec3 fogCol;
	uniform vec3 sun;
	uniform float fogDist;
	
	varying vec4 vMpos;
	varying vec4 vTransPos;
	varying vec3 vPos;
	varying vec2 vUvOffset;
	varying vec2 vPlanePos;
	varying float vCoef;
	
	void main()
	{
		if(vMpos.z > 0.0 && vMpos.z < 256.0 && vMpos.x > 0.0 && vMpos.x < 256.0) {
			discard;
		}
		
		vec2 uv   = (vUvOffset + fract(vPlanePos)) / 16.0;
		float fog = min(1.0, fogDist / length(vTransPos.xyz));
		
		gl_FragColor      = texture2D(atlas, uv);
		gl_FragColor.rgb *= vCoef;
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * fogCol * max(0.0, -sun.y);
	}
`;

	function identity(out = new Float32Array(16))
	{
		out.set([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		]);
		
		return out;
	}

	function translation(x = 0, y = 0, z = 0, out = new Float32Array(16))
	{
		out.set([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			x, y, z, 1,
		]);
		
		return out;
	}

	function perspective(fovy, aspect, near, far, rh = false, out = new Float32Array(16))
	{
		let fl = rh ? -1 : +1;
		let fy = 1 / Math.tan(fovy / 2);
		let fx = fy / aspect;
		let nf = 1 / (near - far);
		let a  = -(near + far) * nf * fl;
		let b  = 2 * far * near * nf;
		
		out.set([
			fx, 0,  0, 0,
			0,  fy, 0, 0,
			0,  0,  a, fl,
			0,  0,  b, 0,
		]);
		
		return out;
	}

	function ortho(scale, aspect, near, far, rh = false, out = new Float32Array(16))
	{
		let sy = scale;
		let sx = sy / aspect;
		let sz = 2 / (far - near);
		let oz = (far + near) / (near - far);
		
		out.set([
			sx, 0,  0,  0,
			0,  sy, 0,  0,
			0,  0,  sz, 0,
			0,  0,  oz, 1,
		]);
		
		return out;
	}

	function multiply(a, b, out = new Float32Array(16))
	{
		let a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3];
		let a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7];
		let a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11];
		let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
		
		let b0, b1, b2, b3;

		b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
		
		out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
		
		out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
		
		out[8]  = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[9]  = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
		
		out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
		
		return out;
	}

	function translate(m, x = 0, y = 0, z = 0, out = new Float32Array(16))
	{
		let a00 = m[0], a01 = m[1], a02 = m[2],  a03 = m[3];
		let a10 = m[4], a11 = m[5], a12 = m[6],  a13 = m[7];
		let a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
		
		out[0]  = a00;
		out[1]  = a01;
		out[2]  = a02;
		out[3]  = a03;
		out[4]  = a10;
		out[5]  = a11;
		out[6]  = a12;
		out[7]  = a13;
		out[8]  = a20;
		out[9]  = a21;
		out[10] = a22;
		out[11] = a23;
		out[12] = x * a00 + y * a10 + z * a20 + m[12];
		out[13] = x * a01 + y * a11 + z * a21 + m[13];
		out[14] = x * a02 + y * a12 + z * a22 + m[14];
		out[15] = x * a03 + y * a13 + z * a23 + m[15];
		
		return out;
	}

	function rotateX$1(m, a, out = new Float32Array(16))
	{
		let s = Math.sin(a);
		let c = Math.cos(a);
		
		let a10 = m[4], a11 = m[5], a12 = m[6],  a13 = m[7];
		let a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
		
		out[0]  =  m[0];
		out[1]  =  m[1];
		out[2]  =  m[2];
		out[3]  =  m[3];
		out[4]  =  c * a10 + s * a20;
		out[5]  =  c * a11 + s * a21;
		out[6]  =  c * a12 + s * a22;
		out[7]  =  c * a13 + s * a23;
		out[8]  = -s * a10 + c * a20;
		out[9]  = -s * a11 + c * a21;
		out[10] = -s * a12 + c * a22;
		out[11] = -s * a13 + c * a23;
		out[12] =  m[12];
		out[13] =  m[13];
		out[14] =  m[14];
		out[15] =  m[15];
		
		return out;
	}

	function rotateY$1(m, a = 0, out = new Float32Array(16))
	{
		let s = Math.sin(a);
		let c = Math.cos(a);
		
		let a00 = m[0], a01 = m[1], a02 = m[2],  a03 = m[3];
		let a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
		
		out[0]  =  c * a00 + s * a20;
		out[1]  =  c * a01 + s * a21;
		out[2]  =  c * a02 + s * a22;
		out[3]  =  c * a03 + s * a23;
		out[4]  =  m[4];
		out[5]  =  m[5];
		out[6]  =  m[6];
		out[7]  =  m[7];
		out[8]  = -s * a00 + c * a20;
		out[9]  = -s * a01 + c * a21;
		out[10] = -s * a02 + c * a22;
		out[11] = -s * a03 + c * a23;
		out[12] =  m[12];
		out[13] =  m[13];
		out[14] =  m[14];
		out[15] =  m[15];
		
		return out;
	}

	function rotateZ$1(m, a = 0, out = new Float32Array(16))
	{
		let s = Math.sin(a);
		let c = Math.cos(a);
		
		let a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
		let a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
		
		out[0]  =  c * a00 + s * a10;
		out[1]  =  c * a01 + s * a11;
		out[2]  =  c * a02 + s * a12;
		out[3]  =  c * a03 + s * a13;
		out[4]  = -s * a00 + c * a10;
		out[5]  = -s * a01 + c * a11;
		out[6]  = -s * a02 + c * a12;
		out[7]  = -s * a03 + c * a13;
		out[8]  =  m[8];
		out[9]  =  m[9];
		out[10] =  m[10];
		out[11] =  m[11];
		out[12] =  m[12];
		out[13] =  m[13];
		out[14] =  m[14];
		out[15] =  m[15];
		
		return out;
	}

	let nullVector = create64();

	class Camera
	{
		constructor(righthand = false, ortho$$1 = false)
		{
			this.righthand = righthand;
			this.ortho     = ortho$$1;
			this.oscale    = 1;
			this.fovy      = 90;
			this.aspect    = 1;
			this.near      = 0.0625;
			this.far       = 1024;
			this.xangle    = 0;
			this.yangle    = 0;
			this.pos       = create64();
			this.projDirty = true;
			this.rotaDirty = false;
			this.matrix    = identity();
			this.proj      = identity();
			this.viewmodel = identity();
			this.rota      = identity();
			this.view      = identity();
			this.viewProj  = identity();
			this.model     = identity();
		}
		
		setOrthoScale(oscale)
		{
			this.oscale    = oscale;
			this.projDirty = true;
			
			return this;
		}
		
		setFovy(fovy)
		{
			this.fovy      = fovy;
			this.projDirty = true;
			
			return this;
		}
		
		setAspect(aspect)
		{
			this.aspect    = aspect;
			this.projDirty = true;
			
			return this;
		}
		
		setNear(near)
		{
			this.near      = near;
			this.projDirty = true;
			
			return this;
		}
		
		setFar(far)
		{
			this.far       = far;
			this.projDirty = true;
			
			return this;
		}
		
		setProjection(fovyOrOscale, aspect, near, far)
		{
			if(this.ortho) {
				this.setOrthoScale(fovyOrOscale);
			}
			else {
				this.setFovy(fovyOrOscale);
			}
			
			this.setAspect(aspect);
			this.setNear(near);
			this.setFar(far);
			
			return this;
		}
		
		setXangle(xangle)
		{
			this.xangle    = xangle;
			this.rotaDirty = true;
			
			return this;
		}
		
		setYangle(yangle)
		{
			this.yangle    = yangle;
			this.rotaDirty = true;
			
			return this;
		}
		
		setAngle(xangle, yangle)
		{
			this.setXangle(xangle);
			this.setYangle(yangle);
			
			return this;
		}
		
		setPos(pos)
		{
			copy(pos, this.pos);
			
			return this;
		}
		
		setFromMovable(movable)
		{
			this.setPos(movable.pos);
			this.setAngle(movable.xangle, movable.yangle);
			
			return this;
		}
		
		getMatrix(pos = nullVector, ax = 0, ay = 0, az = 0)
		{
			multiply(this.getProjection(), this.getViewModel(pos, ax, ay, az), this.matrix);
			
			return this.matrix;
		}
		
		getProjection()
		{
			if(this.projDirty) {
				if(this.ortho) {
					ortho(
						this.oscale, this.aspect, this.near, this.far, this.righthand, this.proj
					);
				}
				else {
					perspective(
						radians(this.fovy),
						this.aspect,
						this.near,
						this.far,
						this.righthand,
						this.proj
					);
				}
				
				this.projDirty = false;
			}
			
			return this.proj;
		}
		
		getViewModel(pos = nullVector, ax = 0, ay = 0, az = 0)
		{
			translate(
				this.getRota(),
				pos[0] - this.pos[0],
				pos[1] - this.pos[1],
				pos[2] - this.pos[2],
				this.viewmodel
			);
			
			if(ax) {
				rotateX$1(this.viewmodel, ax, this.viewmodel);
			}
			
			if(ay) {
				rotateY$1(this.viewmodel, ay, this.viewmodel);
			}
			
			if(az) {
				rotateZ$1(this.viewmodel, az, this.viewmodel);
			}
			
			return this.viewmodel;
		}
		
		getView()
		{
			translate(this.getRota(), -this.pos[0], -this.pos[1], -this.pos[2], this.view);
			
			return this.view;
		}
		
		getProjView()
		{
			multiply(this.getProjection(), this.getView(), this.viewProj);
			
			return this.viewProj;
		}
		
		getModel(pos = nullVector, ax = 0, ay = 0, az = 0)
		{
			translation(pos[0], pos[1], pos[2], this.model);
			
			if(ax) {
				rotateX$1(this.model, ax, this.model);
			}
			
			if(ay) {
				rotateY$1(this.model, ay, this.model);
			}
			
			if(az) {
				rotateZ$1(this.model, az, this.model);
			}
			
			return this.model;
		}
		
		getRota()
		{
			if(this.rotaDirty) {
				identity(this.rota);
				rotateX$1(this.rota, this.xangle, this.rota);
				rotateY$1(this.rota, this.yangle, this.rota);
				this.rotaDirty = false;
			}
			
			return this.rota;
		}
	}

	class ShadowMap
	{
		constructor(display, sun)
		{
			this.display  = display;
			this.sun      = sun;
			this.colortex = display.DataTexture(2048, 2048, false);
			this.depthtex = display.DataTexture(2048, 2048, true);
			this.camera   = new Camera(false, true);
			this.camera.setProjection(2/444, display.getAspect(), -1024, 1024).setPos([128,128,128]);
		}
		
		beginDraw()
		{
			this.display.renderToTextures(this.colortex, this.depthtex);
			let d = this.sun.getSkyDir();
			this.camera.setAspect(this.display.getAspect());
			this.camera.setYangle(Math.atan2(d[0], d[2]) + Math.PI);
			this.camera.setXangle(-Math.asin(d[1]));
		}
		
		endDraw()
		{
			this.display.renderToCanvas();
		}
	}

	let layout$1 = new VertexLayout("float", ["pos", 3], ["norm", 3], ["uv", 2]);

	class Model
	{
		constructor(display, data, indices, texfile)
		{
			this.display = display;
			this.buf     = display.Buffer("static", layout$1, data);
			this.ibuf    = display.Buffer("static", "index", indices);
			this.shader  = display.getShader("model", modelVertSrc, modelFragSrc);
			this.tex     = display.getTexture(texfile);
		}
		
		draw(pos, camera, sun, instances = null)
		{
			let shader = this.shader;
			let buf    = this.buf;
			
			shader.use();
			shader.texture("tex",     this.tex);
			shader.uniform("proj",    camera.getProjection());
			shader.uniform("view",    camera.getView());
			shader.uniform("model",   camera.getModel(pos));
			shader.uniform("sun",     sun);
			shader.uniform("diff",    0.5);
			shader.uniform("fogCol",  [0.75, 0.875, 1.0]);
			shader.uniform("fogDist", 16);
			shader.indices(this.ibuf);
			shader.buffer(buf);
			
			if(instances) {
				shader.instancebuffer(instances);
			}
			else {
				shader.constattrib("ipos", pos);
			}
			
			shader.triangles();
		}
	}

	const modelVertSrc = `
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 model;
	uniform vec3 sun;
	uniform float diff;
	
	attribute vec3 ipos;
	attribute vec3 pos;
	attribute vec3 norm;
	attribute vec2 uv;
	
	varying vec4 vTransPos;
	varying vec2 vUv;
	varying float vCoef;
	
	void main()
	{
		vTransPos   = view * model * vec4(ipos + pos, 1);
		gl_Position = proj * vTransPos;
		vCoef       = (1.0 - diff) + diff * max(0.0, dot(norm, sun));
		vUv         = uv;
	}
`;

	const modelFragSrc = `
	uniform sampler2D tex;
	uniform vec3 fogCol;
	uniform vec3 sun;
	uniform float fogDist;
	
	varying vec4 vTransPos;
	varying vec2 vUv;
	varying float vCoef;
	
	void main()
	{
		float fog = min(1.0, fogDist / length(vTransPos.xyz));
		
		gl_FragColor      = texture2D(tex, vUv);
		
		if(gl_FragColor.a == 0.0) {
			discard;
		}
		
		gl_FragColor.rgb *= vCoef;
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * fogCol * sun.y;
	}
`;

	class ModelBatch
	{
		constructor(model)
		{
			let display = model.display;
			
			this.model     = model;
			this.data      = [];
			this.display   = display;
			this.instances = 0;
			this.modified  = false;
			this.buf       = display.Buffer("dynamic", instLayout);
		}
		
		add(x, y, z)
		{
			this.data.push(x);
			this.data.push(y);
			this.data.push(z);
			this.modified = true;
		}
		
		update(data)
		{
			if(data || this.modified) {
				this.data = data;
				this.buf.update(this.data);
				this.modified = false;
			}
		}
		
		draw(camera, sun)
		{
			this.model.draw([0.5, 0, 0.5], camera, sun, this.buf);
		}
	}

	let instLayout = new VertexLayout("float", ["ipos", 3]);

	let tree1 = {
		"data": [
			0.022309735417366028,
			1.6770797967910767,
			0.254466712474823,
			-0.024811547249555588,
			0.0711691677570343,
			0.9971312880516052,
			0.1875,
			0.053842782974243164,
			-0.002658708021044731,
			2.3021717071533203,
			0.28786805272102356,
			0.04864650219678879,
			-0.25705739855766296,
			0.965147852897644,
			0.1875,
			0.0,
			0.10768579691648483,
			2.301990270614624,
			0.2660728693008423,
			0.7323831915855408,
			-0.15237891674041748,
			0.6635944843292236,
			0.140625,
			0.0,
			0.11233750730752945,
			1.6911218166351318,
			0.2274942696094513,
			0.5405743718147278,
			0.09213537722826004,
			0.8362071514129639,
			0.140625,
			0.05384272336959839,
			0.1558932512998581,
			2.3294472694396973,
			0.15524403750896454,
			0.8035218119621277,
			0.12048707902431488,
			0.5829035043716431,
			0.0937500074505806,
			0.0,
			0.18274426460266113,
			1.6848583221435547,
			0.14722761511802673,
			0.7058625817298889,
			0.1263771504163742,
			0.6969512104988098,
			0.09375,
			0.05384272336959839,
			0.25860685110092163,
			2.3650760650634766,
			0.09691984206438065,
			0.7579576969146729,
			0.0868556797504425,
			0.6464430689811707,
			0.046875,
			0.0,
			0.24445028603076935,
			1.7181252241134644,
			0.09303884953260422,
			0.869716465473175,
			0.08365123718976974,
			0.4863734841346741,
			0.0468750037252903,
			0.05384266376495361,
			0.2680567502975464,
			2.3742482662200928,
			-0.016169628128409386,
			0.9955748319625854,
			-0.09085360169410706,
			-0.022705771028995514,
			0.0,
			0.0,
			0.2594384253025055,
			1.7085752487182617,
			-0.002021774649620056,
			0.9970091581344604,
			0.07562486827373505,
			-0.015655994415283203,
			0.0,
			0.05384272336959839,
			0.2594384253025055,
			1.7085752487182617,
			-0.002021774649620056,
			0.9970091581344604,
			0.07562486827373505,
			-0.015655994415283203,
			0.75,
			0.05384272336959839,
			0.2680567502975464,
			2.3742482662200928,
			-0.016169628128409386,
			0.9955748319625854,
			-0.09085360169410706,
			-0.022705771028995514,
			0.7499999403953552,
			5.960464477539063e-08,
			0.24560174345970154,
			2.3597586154937744,
			-0.11360667645931244,
			0.9170812368392944,
			-0.14908291399478912,
			-0.36970123648643494,
			0.703125,
			0.0,
			0.24115118384361267,
			1.7188022136688232,
			-0.09806791692972183,
			0.904843270778656,
			0.039368875324726105,
			-0.42390209436416626,
			0.7031250596046448,
			0.05384260416030884,
			0.184304878115654,
			2.330986499786377,
			-0.19620977342128754,
			0.6778466105461121,
			-0.18012024462223053,
			-0.712759792804718,
			0.6562499403953552,
			1.1920928955078125e-07,
			0.18349194526672363,
			1.7046922445297241,
			-0.16888990998268127,
			0.6986297369003296,
			0.021851252764463425,
			-0.7151097059249878,
			0.65625,
			0.059914231300354004,
			0.09668362140655518,
			2.3073294162750244,
			-0.25140342116355896,
			-0.011658070608973503,
			-0.14145329594612122,
			-0.9898678660392761,
			0.609375,
			0.0,
			0.1146685928106308,
			1.698598861694336,
			-0.22214901447296143,
			0.18686483800411224,
			-0.004913480021059513,
			-0.982360303401947,
			0.609375,
			0.05384272336959839,
			-0.0017989499028772116,
			2.3024003505706787,
			-0.19946549832820892,
			-0.021118808537721634,
			0.03021332435309887,
			-0.999298095703125,
			0.5625,
			0.0,
			0.02061009779572487,
			1.6538593769073486,
			-0.19694232940673828,
			0.004119998775422573,
			-0.009002960287034512,
			-0.99993896484375,
			0.5624839067459106,
			0.05585682392120361,
			-0.09971865266561508,
			2.3001248836517334,
			-0.25140345096588135,
			0.11609241366386414,
			-0.010132145136594772,
			-0.9931638240814209,
			0.515625,
			0.0,
			-0.06999591737985611,
			1.6783192157745361,
			-0.22074168920516968,
			-0.252296507358551,
			-0.036896876990795135,
			-0.9669179320335388,
			0.515625,
			0.05384266376495361,
			-0.18268586695194244,
			2.3021011352539062,
			-0.1962098479270935,
			-0.5365764498710632,
			-0.21927548944950104,
			-0.8148441910743713,
			0.46875,
			0.0,
			-0.1296141892671585,
			1.6892818212509155,
			-0.16524368524551392,
			-0.7239906191825867,
			-0.06875820457935333,
			-0.6863612532615662,
			0.46875,
			0.05384266376495361,
			-0.24201899766921997,
			2.3245725631713867,
			-0.11360666900873184,
			-0.8250068426132202,
			-0.32181769609451294,
			-0.46449172496795654,
			0.421875,
			0.0,
			-0.18473239243030548,
			1.6797380447387695,
			-0.09987529367208481,
			-0.8918119072914124,
			-0.06009094417095184,
			-0.44834741950035095,
			0.421875,
			0.05384266376495361,
			-0.26788127422332764,
			2.3597543239593506,
			-0.016169626265764236,
			-0.9263588190078735,
			-0.3484298288822174,
			-0.1429487019777298,
			0.375,
			0.0,
			-0.20743726193904877,
			1.728675127029419,
			-0.00253906287252903,
			-0.9929807186126709,
			-0.06161687150597572,
			-0.10089419037103653,
			0.375,
			0.05384266376495361,
			-0.28253453969955444,
			2.385479211807251,
			0.11111500859260559,
			-0.904995858669281,
			-0.28266242146492004,
			0.317850261926651,
			0.328125,
			0.0,
			-0.20679333806037903,
			1.717093825340271,
			0.10920422524213791,
			-0.9468978047370911,
			-0.031281471252441406,
			0.31992554664611816,
			0.328125,
			0.053842782974243164,
			-0.21669302880764008,
			2.3649916648864746,
			0.20400549471378326,
			-0.7958616614341736,
			0.05471968650817871,
			0.6029542088508606,
			0.28125,
			0.0,
			-0.15480291843414307,
			1.71999990940094,
			0.1765362024307251,
			-0.670400083065033,
			-0.008423108607530594,
			0.7419354915618896,
			0.28125,
			0.053842782974243164,
			-0.11682286858558655,
			2.3271024227142334,
			0.26607292890548706,
			-0.48048341274261475,
			-0.2301095575094223,
			0.8462477326393127,
			0.2343749850988388,
			5.960464477539063e-08,
			-0.07458615303039551,
			1.6897534132003784,
			0.2241719663143158,
			-0.40089112520217896,
			0.03408917412161827,
			0.9154637455940247,
			0.234375,
			0.05384272336959839,
			-0.15542882680892944,
			0.0,
			0.436589777469635,
			-0.4110843241214752,
			0.1508529931306839,
			0.8990142345428467,
			0.234375,
			0.25,
			-0.04281075298786163,
			0.9748057126998901,
			0.3400486707687378,
			-0.4040040373802185,
			0.14462721347808838,
			0.9032257795333862,
			0.234375,
			0.125,
			0.07475584745407104,
			0.9726418256759644,
			0.39517420530319214,
			-0.07342753559350967,
			0.16794335842132568,
			0.983031690120697,
			0.1875000149011612,
			0.12499994039535522,
			-0.008449959568679333,
			0.0,
			0.5422500967979431,
			-0.15350809693336487,
			0.1593066155910492,
			0.9752189517021179,
			0.1875,
			0.25,
			-0.2901780307292938,
			0.0,
			0.40636610984802246,
			-0.5258339047431946,
			0.17752617597579956,
			0.8318125009536743,
			0.28125,
			0.25,
			-0.13305960595607758,
			1.0085275173187256,
			0.2901039719581604,
			-0.5775322914123535,
			0.13254188001155853,
			0.8055055141448975,
			0.28125,
			0.125,
			-0.4703896939754486,
			0.0,
			0.2441544234752655,
			-0.8824732303619385,
			0.24240851402282715,
			0.4030274450778961,
			0.328125,
			0.25,
			-0.19008074700832367,
			0.9734007120132446,
			0.22632740437984467,
			-0.887386679649353,
			0.17099520564079285,
			0.4280831217765808,
			0.328125,
			0.12500005960464478,
			-0.4704248607158661,
			0.0,
			0.025350062176585197,
			-0.9621570706367493,
			0.2717978358268738,
			0.01907406747341156,
			0.375,
			0.25,
			-0.21123014390468597,
			1.0394834280014038,
			0.08496681600809097,
			-0.9953917264938354,
			0.09262367337942123,
			-0.0237128809094429,
			0.3749999701976776,
			0.125,
			-0.5041897892951965,
			0.0,
			-0.18922927975654602,
			-0.8901638984680176,
			0.32230597734451294,
			-0.32203131914138794,
			0.421875,
			0.25,
			-0.18250690400600433,
			0.9504019021987915,
			-0.0559258908033371,
			-0.9056367874145508,
			0.20831935107707977,
			-0.36927396059036255,
			0.4218749701976776,
			0.12500005960464478,
			-0.36622828245162964,
			0.0,
			-0.3810161054134369,
			-0.6373790502548218,
			0.3236792981624603,
			-0.6992095708847046,
			0.46875,
			0.25,
			-0.10821907222270966,
			1.006540060043335,
			-0.1278580278158188,
			-0.7093722224235535,
			0.09039582312107086,
			-0.6989959478378296,
			0.46875,
			0.125,
			-0.18289153277873993,
			0.0,
			-0.4450398087501526,
			-0.35184788703918457,
			0.3014618456363678,
			-0.886165976524353,
			0.515625,
			0.25,
			-0.05269836261868477,
			0.9787806272506714,
			-0.20866884291172028,
			-0.3245948553085327,
			0.14737388491630554,
			-0.9342631101608276,
			0.515625,
			0.125,
			-0.04013746976852417,
			0.0,
			-0.5295751094818115,
			-0.12921537458896637,
			0.3024384379386902,
			-0.9443647861480713,
			0.5625,
			0.25,
			0.0689108818769455,
			0.9080092906951904,
			-0.2113744169473648,
			-0.08294931054115295,
			0.21311074495315552,
			-0.9734793901443481,
			0.5624625086784363,
			0.12967586517333984,
			0.21457935869693756,
			0.0,
			-0.5020774006843567,
			0.38422802090644836,
			0.2689290940761566,
			-0.8831751346588135,
			0.609375,
			0.25,
			0.19934111833572388,
			1.0254428386688232,
			-0.21256773173809052,
			0.3787652254104614,
			0.110873743891716,
			-0.9187902212142944,
			0.609375,
			0.125,
			0.32186585664749146,
			0.0,
			-0.34510338306427,
			0.7206335663795471,
			0.1828974336385727,
			-0.6687520742416382,
			0.65625,
			0.25,
			0.2742132246494293,
			1.0110594034194946,
			-0.13795973360538483,
			0.7156285047531128,
			0.12912380695343018,
			-0.6864222884178162,
			0.65625,
			0.13909518718719482,
			0.4577147960662842,
			0.0,
			-0.24415439367294312,
			0.8367869853973389,
			0.18549150228500366,
			-0.5150914192199707,
			0.703125,
			0.25,
			0.35294559597969055,
			1.0121251344680786,
			-0.05091867595911026,
			0.8898282051086426,
			0.14865565299987793,
			-0.43137913942337036,
			0.703125,
			0.12500005960464478,
			0.5169001221656799,
			0.0,
			-0.04858766496181488,
			0.9864192605018616,
			0.1512802541255951,
			-0.0638752430677414,
			0.75,
			0.25,
			0.3739330768585205,
			0.9646430015563965,
			0.08639992773532867,
			0.9881893396377563,
			0.15262307226657867,
			-0.011810663156211376,
			0.75,
			0.125,
			0.4999649226665497,
			0.0,
			0.20401673018932343,
			0.8914151191711426,
			0.11987670511007309,
			0.4369640052318573,
			0.046875,
			0.25,
			0.3448983132839203,
			1.0032222270965576,
			0.2003023624420166,
			0.8738059401512146,
			0.17300942540168762,
			0.4543900787830353,
			0.0468749962747097,
			0.125,
			0.3739330768585205,
			0.9646430015563965,
			0.08639992773532867,
			0.9881893396377563,
			0.15262307226657867,
			-0.011810663156211376,
			0.0,
			0.125,
			0.5169001221656799,
			0.0,
			-0.04858766496181488,
			0.9864192605018616,
			0.1512802541255951,
			-0.0638752430677414,
			0.0,
			0.25,
			0.3472159206867218,
			0.0,
			0.3070782423019409,
			0.6830347776412964,
			0.08307138085365295,
			0.7256081104278564,
			0.09375,
			0.25,
			0.3096899390220642,
			0.9581447839736938,
			0.2733485698699951,
			0.6794030666351318,
			0.13110750913619995,
			0.7219153642654419,
			0.0937499925494194,
			0.125,
			0.1934542953968048,
			0.0,
			0.5020773410797119,
			0.48039186000823975,
			0.11593981832265854,
			0.86931973695755,
			0.140625,
			0.25,
			0.1783427596092224,
			1.0117840766906738,
			0.34925299882888794,
			0.4859462380409241,
			0.1749320924282074,
			0.8562883138656616,
			0.140625,
			0.125,
			-0.11217229068279266,
			2.3471336364746094,
			0.10627355426549911,
			-0.5515304803848267,
			0.7502059936523438,
			0.3646656572818756,
			0.2890625,
			0.25,
			0.003811241127550602,
			2.5899970531463623,
			0.003932641819119453,
			-0.17874690890312195,
			0.9065523147583008,
			0.382335901260376,
			0.40625,
			0.25,
			0.026193473488092422,
			3.217660903930664,
			0.38900226354599,
			0.08124027401208878,
			0.44697409868240356,
			-0.8908352851867676,
			0.40625,
			0.140625,
			-0.10896281152963638,
			3.201862335205078,
			0.442971408367157,
			-0.6390575766563416,
			0.17709891498088837,
			-0.748466432094574,
			0.2890625,
			0.140625,
			-0.11682286858558655,
			2.3271024227142334,
			0.26607292890548706,
			-0.48048341274261475,
			-0.2301095575094223,
			0.8462477326393127,
			0.1015625,
			0.25,
			-0.21669302880764008,
			2.3649916648864746,
			0.20400549471378326,
			-0.7958616614341736,
			0.05471968650817871,
			0.6029542088508606,
			0.1953125,
			0.2500000596046448,
			-0.184422567486763,
			3.1675705909729004,
			0.5495653748512268,
			-0.9811395406723022,
			-0.19168676435947418,
			-0.0236823633313179,
			0.1953125,
			0.140625,
			-0.11564496159553528,
			3.1294870376586914,
			0.6902139782905579,
			-0.5378581881523132,
			-0.25690481066703796,
			0.8029114603996277,
			0.1015625,
			0.140625,
			0.1558932512998581,
			2.3294472694396973,
			0.15524403750896454,
			0.8035218119621277,
			0.12048707902431488,
			0.5829035043716431,
			0.54296875,
			0.25,
			0.1763743758201599,
			3.2002391815185547,
			0.448516845703125,
			0.8198797702789307,
			0.3717764914035797,
			-0.4353465437889099,
			0.54296875,
			0.140625,
			0.10768579691648483,
			2.301990270614624,
			0.2660728693008423,
			0.7323831915855408,
			-0.15237891674041748,
			0.6635944843292236,
			0.63671875,
			0.25,
			0.20460622012615204,
			3.1529605388641357,
			0.6100253462791443,
			0.9345072507858276,
			-0.09097567945718765,
			0.34403514862060547,
			0.63671875,
			0.140625,
			-0.002658708021044731,
			2.3021717071533203,
			0.28786805272102356,
			0.04864650219678879,
			-0.25705739855766296,
			0.965147852897644,
			0.0,
			0.25,
			0.04785935953259468,
			3.1208231449127197,
			0.719810962677002,
			0.1355021893978119,
			-0.3090914487838745,
			0.9413129091262817,
			0.0,
			0.140625,
			-0.002658708021044731,
			2.3021717071533203,
			0.28786805272102356,
			0.04864650219678879,
			-0.25705739855766296,
			0.965147852897644,
			0.75,
			0.25,
			0.04785935953259468,
			3.1208231449127197,
			0.719810962677002,
			0.1355021893978119,
			-0.3090914487838745,
			0.9413129091262817,
			0.75,
			0.140625,
			0.35660320520401,
			3.0606303215026855,
			-0.1113099455833435,
			0.6381115317344666,
			0.1519821733236313,
			0.7547532320022583,
			0.04720883443951607,
			0.19921875,
			0.22649544477462769,
			3.1451945304870605,
			-0.1374768614768982,
			-0.20911282300949097,
			0.44862207770347595,
			0.868861973285675,
			0.10778429359197617,
			0.19921875,
			0.3674342930316925,
			3.455211639404297,
			-0.3082086741924286,
			-0.2467421442270279,
			0.6195867657661438,
			0.7451093792915344,
			0.09630602598190308,
			0.11328125,
			0.4468599855899811,
			3.3972179889678955,
			-0.26921284198760986,
			0.4838709533214569,
			0.32151249051094055,
			0.8139286637306213,
			0.04720883443951607,
			0.11328125,
			0.29635703563690186,
			3.033977508544922,
			-0.4337158203125,
			0.5424665212631226,
			-0.3978087604045868,
			-0.7398907542228699,
			0.27569958567619324,
			0.19921875,
			0.3507399260997772,
			3.0107076168060303,
			-0.34232839941978455,
			0.8633075952529907,
			-0.3891720175743103,
			-0.32120731472969055,
			0.31535500288009644,
			0.19921875,
			0.5081892609596252,
			3.286745071411133,
			-0.4287755787372589,
			0.8496047854423523,
			-0.4752952754497528,
			-0.22852259874343872,
			0.31535500288009644,
			0.11328125,
			0.45854511857032776,
			3.3060882091522217,
			-0.5030182003974915,
			0.42609941959381104,
			-0.5356303453445435,
			-0.7290261387825012,
			0.27569958567619324,
			0.11328125,
			0.3695833683013916,
			3.021838426589966,
			-0.22792568802833557,
			0.9681081771850586,
			-0.22690512239933014,
			0.10592974722385406,
			0.0,
			0.19921875,
			0.5084236264228821,
			3.327112913131714,
			-0.33264532685279846,
			0.9317606091499329,
			-0.17911313474178314,
			0.3157444894313812,
			0.0,
			0.11328125,
			0.21657879650592804,
			3.0836901664733887,
			-0.48340660333633423,
			-0.21179845929145813,
			-0.174077570438385,
			-0.9616687297821045,
			0.2341558337211609,
			0.19921875,
			0.3725211024284363,
			3.376147508621216,
			-0.5426528453826904,
			-0.3586535155773163,
			-0.2783593237400055,
			-0.8909573554992676,
			0.2341558337211609,
			0.11328125,
			0.14022111892700195,
			3.179290533065796,
			-0.23167075216770172,
			-0.7946104407310486,
			0.4700155556201935,
			0.38422802090644836,
			0.1416265070438385,
			0.19921875,
			0.30785098671913147,
			3.480243444442749,
			-0.39202141761779785,
			-0.7600939869880676,
			0.5875728726387024,
			0.2774437665939331,
			0.1416265070438385,
			0.11328125,
			0.13063201308250427,
			3.175539493560791,
			-0.3276810050010681,
			-0.9246192574501038,
			0.32142093777656555,
			-0.20426037907600403,
			0.1652309149503708,
			0.19921875,
			0.14261259138584137,
			3.145334005355835,
			-0.4089198708534241,
			-0.7924741506576538,
			0.1518601030111313,
			-0.5906857252120972,
			0.18883533775806427,
			0.19921875,
			0.33894503116607666,
			3.4179210662841797,
			-0.5111109614372253,
			-0.8363902568817139,
			0.1268654465675354,
			-0.5332193970680237,
			0.2113640010356903,
			0.11328125,
			0.3160237669944763,
			3.454866886138916,
			-0.4575302302837372,
			-0.9161961674690247,
			0.3324686288833618,
			-0.22367015480995178,
			0.17846444249153137,
			0.11328125,
			0.3695833683013916,
			3.021838426589966,
			-0.22792568802833557,
			0.9681081771850586,
			-0.22690512239933014,
			0.10592974722385406,
			0.3625638484954834,
			0.19921875,
			0.5084236264228821,
			3.327112913131714,
			-0.33264532685279846,
			0.9317606091499329,
			-0.17911313474178314,
			0.3157444894313812,
			0.3625638484954834,
			0.11328125,
			0.4483543038368225,
			3.578489303588867,
			-0.7006768584251404,
			-0.5010834336280823,
			-0.42243722081184387,
			-0.7552415728569031,
			0.2341558337211609,
			0.0,
			0.39986294507980347,
			3.6718835830688477,
			-0.6617036461830139,
			-0.764976978302002,
			0.3334452211856842,
			-0.5509811639785767,
			0.18883533775806427,
			0.0,
			0.5857326984405518,
			3.5244290828704834,
			-0.5975998044013977,
			0.7084566950798035,
			-0.7000030279159546,
			-0.08960234373807907,
			0.31535500288009644,
			0.0,
			0.5301733613014221,
			3.5236053466796875,
			-0.659159779548645,
			0.17163610458374023,
			-0.7932065725326538,
			-0.5842463374137878,
			0.27569958567619324,
			0.0,
			0.5576097965240479,
			3.668100595474243,
			-0.48497825860977173,
			0.33671072125434875,
			0.5199743509292603,
			0.7849971055984497,
			0.04720883443951607,
			0.0,
			0.6015688180923462,
			3.5860061645507812,
			-0.5275284051895142,
			0.791558563709259,
			-0.21112704277038574,
			0.573442816734314,
			0.0,
			0.0,
			0.40780454874038696,
			3.6931393146514893,
			-0.6275232434272766,
			-0.731315016746521,
			0.5952940583229065,
			-0.3328043520450592,
			0.1652309149503708,
			5.960464477539063e-08,
			0.6015688180923462,
			3.5860061645507812,
			-0.5275284051895142,
			0.791558563709259,
			-0.21112704277038574,
			0.573442816734314,
			0.3625638484954834,
			0.0,
			0.4815760850906372,
			3.7123427391052246,
			-0.5234359502792358,
			-0.1345866322517395,
			0.8825342655181885,
			0.4505447447299957,
			0.09630602598190308,
			0.0,
			0.41574627161026,
			3.714395523071289,
			-0.5933435559272766,
			-0.5282143354415894,
			0.8484145402908325,
			-0.03415021300315857,
			0.1416265070438385,
			0.0,
			-0.0017989499028772116,
			2.3024003505706787,
			-0.19946549832820892,
			-0.021118808537721634,
			0.03021332435309887,
			-0.999298095703125,
			0.17678168416023254,
			0.25,
			0.09668362140655518,
			2.3073294162750244,
			-0.25140342116355896,
			-0.011658070608973503,
			-0.14145329594612122,
			-0.9898678660392761,
			0.2341558337211609,
			0.25,
			0.24560174345970154,
			2.3597586154937744,
			-0.11360667645931244,
			0.9170812368392944,
			-0.14908291399478912,
			-0.36970123648643494,
			0.31535500288009644,
			0.25,
			0.2680567502975464,
			2.3742482662200928,
			-0.016169628128409386,
			0.9955748319625854,
			-0.09085360169410706,
			-0.022705771028995514,
			0.3625638484954834,
			0.25,
			0.0035701626911759377,
			2.588860511779785,
			-0.1835910528898239,
			-0.4354380965232849,
			0.5934019088745117,
			-0.6769005656242371,
			0.15891611576080322,
			0.25,
			0.1558932512998581,
			2.3294472694396973,
			0.15524403750896454,
			0.8035218119621277,
			0.12048707902431488,
			0.5829035043716431,
			0.10761190950870514,
			0.25,
			0.003811241127550602,
			2.5899970531463623,
			0.003932641819119453,
			-0.17874690890312195,
			0.9065523147583008,
			0.382335901260376,
			0.1416265070438385,
			0.24999994039535522,
			0.184304878115654,
			2.330986499786377,
			-0.19620977342128754,
			0.6778466105461121,
			-0.18012024462223053,
			-0.712759792804718,
			0.2756996154785156,
			0.25,
			0.2680567502975464,
			2.3742482662200928,
			-0.016169628128409386,
			0.9955748319625854,
			-0.09085360169410706,
			-0.022705771028995514,
			0.0,
			0.25,
			0.25860685110092163,
			2.3650760650634766,
			0.09691984206438065,
			0.7579576969146729,
			0.0868556797504425,
			0.6464430689811707,
			0.04720883071422577,
			0.25,
			0.026193473488092422,
			3.217660903930664,
			0.38900226354599,
			0.08124027401208878,
			0.44697409868240356,
			-0.8908352851867676,
			0.25547322630882263,
			0.140625,
			0.1763743758201599,
			3.2002391815185547,
			0.448516845703125,
			0.8198797702789307,
			0.3717764914035797,
			-0.4353465437889099,
			0.3414497971534729,
			0.140625,
			0.4062502384185791,
			3.738579273223877,
			1.084020733833313,
			0.9033173322677612,
			0.4034852087497711,
			-0.14542070031166077,
			0.3414497971534729,
			0.0,
			0.3573836386203766,
			3.8017666339874268,
			1.0318492650985718,
			0.38520461320877075,
			0.39149144291877747,
			-0.8356578350067139,
			0.25547322630882263,
			0.0,
			-0.11564496159553528,
			3.1294870376586914,
			0.6902139782905579,
			-0.5378581881523132,
			-0.25690481066703796,
			0.8029114603996277,
			0.06386830657720566,
			0.140625,
			0.26033177971839905,
			3.7163121700286865,
			1.170473337173462,
			-0.6281930208206177,
			0.05496383458375931,
			0.7760856747627258,
			0.06386830657720566,
			0.0,
			0.32183557748794556,
			3.6623129844665527,
			1.2068206071853638,
			-0.05246131867170334,
			-0.8172856569290161,
			0.573809027671814,
			0.0,
			0.0,
			0.20460622012615204,
			3.1529605388641357,
			0.6100253462791443,
			0.9345072507858276,
			-0.09097567945718765,
			0.34403514862060547,
			0.4004051685333252,
			0.140625,
			0.4347054362297058,
			3.6718697547912598,
			1.1487526893615723,
			0.9488204717636108,
			-0.24298837780952454,
			0.20160527527332306,
			0.4004051685333252,
			0.0,
			-0.10896281152963638,
			3.201862335205078,
			0.442971408367157,
			-0.6390575766563416,
			0.17709891498088837,
			-0.748466432094574,
			0.18177902698516846,
			0.140625,
			0.2660767734050751,
			3.810084104537964,
			1.0603947639465332,
			-0.5414593815803528,
			0.40281379222869873,
			-0.7379070520401001,
			0.18177902698516846,
			0.0,
			-0.184422567486763,
			3.1675705909729004,
			0.5495653748512268,
			-0.9811395406723022,
			-0.19168676435947418,
			-0.0236823633313179,
			0.12282367050647736,
			0.140625,
			0.20315802097320557,
			3.7818636894226074,
			1.115983247756958,
			-0.9310587048530579,
			0.2861415445804596,
			0.22629474103450775,
			0.12282367050647736,
			0.0,
			0.04785935953259468,
			3.1208231449127197,
			0.719810962677002,
			0.1355021893978119,
			-0.3090914487838745,
			0.9413129091262817,
			0.4716429114341736,
			0.140625,
			0.32183557748794556,
			3.6623129844665527,
			1.2068206071853638,
			-0.05246131867170334,
			-0.8172856569290161,
			0.573809027671814,
			0.4716429114341736,
			0.0,
			-0.26788127422332764,
			2.3597543239593506,
			-0.016169626265764236,
			-0.9263588190078735,
			-0.3484298288822174,
			-0.1429487019777298,
			0.4997302293777466,
			0.25,
			-0.24201899766921997,
			2.3245725631713867,
			-0.11360666900873184,
			-0.8250068426132202,
			-0.32181769609451294,
			-0.46449172496795654,
			0.5339325070381165,
			0.2500000596046448,
			-0.7082200050354004,
			3.166008472442627,
			-0.37648892402648926,
			-0.5087130069732666,
			-0.556627094745636,
			-0.6567583084106445,
			0.5339325666427612,
			0.125,
			-0.759609580039978,
			3.1491281986236572,
			-0.3009207248687744,
			-0.7107150554656982,
			-0.6761375665664673,
			-0.19415876269340515,
			0.4997302293777466,
			0.125,
			-0.24201899766921997,
			2.3245725631713867,
			-0.11360666900873184,
			-0.8250068426132202,
			-0.32181769609451294,
			-0.46449172496795654,
			0.147646963596344,
			0.2500000596046448,
			-0.18268586695194244,
			2.3021011352539062,
			-0.1962098479270935,
			-0.5365764498710632,
			-0.21927548944950104,
			-0.8148441910743713,
			0.17983746528625488,
			0.25,
			-0.6358723640441895,
			3.2018847465515137,
			-0.4110982418060303,
			-0.21781060099601746,
			-0.36124759912490845,
			-0.9066438674926758,
			0.1798374503850937,
			0.125,
			-0.7082200050354004,
			3.166008472442627,
			-0.37648892402648926,
			-0.5087130069732666,
			-0.556627094745636,
			-0.6567583084106445,
			0.1476469784975052,
			0.125,
			-0.0017989499028772116,
			2.3024003505706787,
			-0.19946549832820892,
			-0.021118808537721634,
			0.03021332435309887,
			-0.999298095703125,
			0.24824216961860657,
			0.2500000596046448,
			0.0035701626911759377,
			2.588860511779785,
			-0.1835910528898239,
			-0.4354380965232849,
			0.5934019088745117,
			-0.6769005656242371,
			0.29250407218933105,
			0.25,
			-0.48676279187202454,
			3.321601629257202,
			-0.2111598402261734,
			0.6837366819381714,
			0.7108981609344482,
			-0.16461683809757233,
			0.29250407218933105,
			0.125,
			-0.4959922432899475,
			3.2996022701263428,
			-0.309994101524353,
			0.575029730796814,
			0.4285103976726532,
			-0.6968901753425598,
			0.24824219942092896,
			0.125,
			-0.09971865266561508,
			2.3001248836517334,
			-0.25140345096588135,
			0.11609241366386414,
			-0.010132145136594772,
			-0.9931638240814209,
			0.212027907371521,
			0.25,
			-0.5513635873794556,
			3.2550766468048096,
			-0.3846474885940552,
			0.2930997610092163,
			0.0638752430677414,
			-0.9539170265197754,
			0.212027907371521,
			0.125,
			0.003811241127550602,
			2.5899970531463623,
			0.003932641819119453,
			-0.17874690890312195,
			0.9065523147583008,
			0.382335901260376,
			0.33073025941848755,
			0.24999994039535522,
			-0.11217229068279266,
			2.3471336364746094,
			0.10627355426549911,
			-0.5515304803848267,
			0.7502059936523438,
			0.3646656572818756,
			0.38102781772613525,
			0.25000011920928955,
			-0.6348658800125122,
			3.255552291870117,
			-0.09650076180696487,
			0.11322367191314697,
			0.4667806029319763,
			0.8770714402198792,
			0.38102787733078003,
			0.125,
			-0.5413862466812134,
			3.30243182182312,
			-0.13811330497264862,
			0.4111758768558502,
			0.6763511896133423,
			0.6110721230506897,
			0.33073025941848755,
			0.125,
			-0.21669302880764008,
			2.3649916648864746,
			0.20400549471378326,
			-0.7958616614341736,
			0.05471968650817871,
			0.6029542088508606,
			0.429313600063324,
			0.24999994039535522,
			-0.28253453969955444,
			2.385479211807251,
			0.11111500859260559,
			-0.904995858669281,
			-0.28266242146492004,
			0.317850261926651,
			0.4615040123462677,
			0.25,
			-0.7739943265914917,
			3.1581826210021973,
			-0.19811394810676575,
			-0.765861988067627,
			-0.5142673850059509,
			0.38590654730796814,
			0.4615040421485901,
			0.125,
			-0.7307813167572021,
			3.1957104206085205,
			-0.12337999045848846,
			-0.36088138818740845,
			0.08996856212615967,
			0.9282509684562683,
			0.429313600063324,
			0.125,
			-1.239435076713562,
			3.526289939880371,
			-0.39656221866607666,
			-0.6411023139953613,
			-0.7501144409179688,
			-0.16205328702926636,
			0.49973025918006897,
			0.00971454381942749,
			-1.2122904062271118,
			3.5384209156036377,
			-0.3279809355735779,
			-0.5690481066703796,
			-0.6124759912490845,
			0.5486617684364319,
			0.4615040421485901,
			0.009714782238006592,
			-1.1717512607574463,
			3.633131265640259,
			-0.5266577005386353,
			-0.3806573748588562,
			-0.21964171528816223,
			-0.8982207775115967,
			0.212027907371521,
			0.0,
			-1.2106223106384277,
			3.614321231842041,
			-0.4695281386375427,
			-0.430768758058548,
			0.02542191743850708,
			-0.9020966291427612,
			0.17894241213798523,
			0.0002446770668029785,
			-1.0710339546203613,
			3.6495933532714844,
			-0.3964460492134094,
			0.4674520194530487,
			0.5696890354156494,
			0.6759239435195923,
			0.33073025941848755,
			0.002560257911682129,
			-1.036268949508667,
			3.634066581726074,
			-0.45097607374191284,
			0.8709677457809448,
			0.47904905676841736,
			-0.10885952413082123,
			0.29250407218933105,
			0.007913589477539062,
			-1.1826281547546387,
			3.5908045768737793,
			-0.3083234429359436,
			-0.041657764464616776,
			0.047120578587055206,
			0.9980162978172302,
			0.4293135702610016,
			0.003542780876159668,
			-1.251330018043518,
			3.567462921142578,
			-0.4413987398147583,
			-0.5167394280433655,
			-0.4442884624004364,
			-0.7318033576011658,
			0.147646963596344,
			0.003542780876159668,
			-1.1441471576690674,
			3.63118314743042,
			-0.36511772871017456,
			0.19418928027153015,
			0.6548966765403748,
			0.730307936668396,
			0.3832937777042389,
			-0.0002694129943847656,
			-1.0781121253967285,
			3.6151480674743652,
			-0.5073179006576538,
			0.5257728695869446,
			0.0718405693769455,
			-0.8475600481033325,
			0.24824221432209015,
			0.007913410663604736,
			-1.251330018043518,
			3.567462921142578,
			-0.4413987398147583,
			-0.5167394280433655,
			-0.4442884624004364,
			-0.7318033576011658,
			0.5339325666427612,
			0.003542661666870117,
			0.2782231569290161,
			3.8722646236419678,
			-1.2111533880233765,
			-0.2837611138820648,
			-0.9122287631034851,
			0.2954191565513611,
			0.3931775987148285,
			0.6214362382888794,
			0.09233833104372025,
			4.005647659301758,
			-0.8769475221633911,
			-0.18405713140964508,
			-0.9694509506225586,
			0.16196173429489136,
			0.4949337840080261,
			0.6364588737487793,
			0.4143252372741699,
			3.881856679916382,
			-0.7683162689208984,
			-0.4034241735935211,
			-0.903653085231781,
			0.143559068441391,
			0.4853841960430145,
			0.5503576993942261,
			0.5081976652145386,
			3.773421287536621,
			-1.1701253652572632,
			-0.42274239659309387,
			-0.8637043237686157,
			0.27426984906196594,
			0.37702473998069763,
			0.5627982318401337,
			0.2782231569290161,
			3.8722646236419678,
			-1.2111533880233765,
			0.2837611138820648,
			0.9122287631034851,
			-0.2954191565513611,
			0.3931775987148285,
			0.6214362382888794,
			0.5081976652145386,
			3.773421287536621,
			-1.1701253652572632,
			0.42274239659309387,
			0.8637043237686157,
			-0.27426984906196594,
			0.37702473998069763,
			0.562798261642456,
			0.4143252372741699,
			3.881856679916382,
			-0.7683162689208984,
			0.4034241735935211,
			0.903653085231781,
			-0.143559068441391,
			0.4853841960430145,
			0.5503576993942261,
			0.09233833104372025,
			4.005647659301758,
			-0.8769475221633911,
			0.18405713140964508,
			0.9694509506225586,
			-0.16196173429489136,
			0.4949337840080261,
			0.6364588737487793,
			0.22898101806640625,
			3.7170557975769043,
			-1.610827088356018,
			-0.25840023159980774,
			-0.8370617032051086,
			0.4821924567222595,
			0.29044729471206665,
			0.6599355638027191,
			0.5509679317474365,
			3.5932648181915283,
			-1.502195954322815,
			-0.43266090750694275,
			-0.8181096911430359,
			0.3787652254104614,
			0.28089770674705505,
			0.5738343894481659,
			0.22898101806640625,
			3.7170557975769043,
			-1.610827088356018,
			0.25840023159980774,
			0.8370617032051086,
			-0.4821924567222595,
			0.29044729471206665,
			0.6599355638027191,
			0.5509679317474365,
			3.5932648181915283,
			-1.502195954322815,
			0.43266090750694275,
			0.8181096911430359,
			-0.3787652254104614,
			0.28089770674705505,
			0.5738343894481659,
			-0.1858741044998169,
			3.648340940475464,
			-1.6635634899139404,
			-0.12915432453155518,
			-0.8296456933021545,
			0.5431073904037476,
			0.29999691247940063,
			0.7460367381572723,
			-0.17220914363861084,
			3.924470901489258,
			-1.3894017934799194,
			-0.08389538526535034,
			-0.921079158782959,
			0.3801995813846588,
			0.3886107802391052,
			0.7358631789684296,
			-0.32251644134521484,
			3.9369330406188965,
			-0.929684042930603,
			-0.026490066200494766,
			-0.9851069450378418,
			0.16971343755722046,
			0.5044834017753601,
			0.7225600481033325,
			-0.1858741044998169,
			3.648340940475464,
			-1.6635634899139404,
			0.12915432453155518,
			0.8296456933021545,
			-0.5431073904037476,
			0.29999691247940063,
			0.7460367381572723,
			-0.17220914363861084,
			3.924470901489258,
			-1.3894017934799194,
			0.08389538526535034,
			0.921079158782959,
			-0.3801995813846588,
			0.38861075043678284,
			0.7358631789684296,
			-0.32251644134521484,
			3.9369330406188965,
			-0.929684042930603,
			0.026490066200494766,
			0.9851069450378418,
			-0.16971343755722046,
			0.5044834017753601,
			0.7225600481033325,
			-1.239435076713562,
			3.526289939880371,
			-0.39656221866607666,
			-0.6411023139953613,
			-0.7501144409179688,
			-0.16205328702926636,
			0.2591632008552551,
			0.23794734477996826,
			-1.251330018043518,
			3.567462921142578,
			-0.4413987398147583,
			-0.5167394280433655,
			-0.4442884624004364,
			-0.7318033576011658,
			0.30070143938064575,
			0.23794734477996826,
			-1.6754584312438965,
			4.0122294425964355,
			-0.2730869650840759,
			-0.7535020112991333,
			-0.0006714072078466415,
			-0.6574297547340393,
			0.3407553434371948,
			0.10526037216186523,
			-1.681185007095337,
			3.9957399368286133,
			-0.24043668806552887,
			-0.6101260185241699,
			-0.7759941220283508,
			-0.1597643941640854,
			0.3184058964252472,
			0.10526037216186523,
			-1.2106223106384277,
			3.614321231842041,
			-0.4695281386375427,
			-0.430768758058548,
			0.02542191743850708,
			-0.9020966291427612,
			0.35615748167037964,
			0.23794734477996826,
			-1.2018728256225586,
			3.643829345703125,
			-0.4416196346282959,
			-0.16556291282176971,
			0.9861140847206116,
			-0.01077303383499384,
			0.38444674015045166,
			0.23794734477996826,
			-1.6190229654312134,
			4.019526958465576,
			-0.2553442120552063,
			0.32081055641174316,
			0.9018524885177612,
			-0.28931546211242676,
			0.3867202699184418,
			0.10526037216186523,
			-1.643163800239563,
			4.023715019226074,
			-0.2780910134315491,
			-0.20474867522716522,
			0.6400647163391113,
			-0.7405011057853699,
			0.36234989762306213,
			0.10526037216186523,
			-1.2122904062271118,
			3.5384209156036377,
			-0.3279809355735779,
			-0.5690481066703796,
			-0.6124759912490845,
			0.5486617684364319,
			0.20729593932628632,
			0.23794734477996826,
			-1.6603978872299194,
			3.986182451248169,
			-0.2081039398908615,
			-0.18720053136348724,
			-0.8908963203430176,
			0.4138004779815674,
			0.2873559892177582,
			0.10526037216186523,
			-1.1441471576690674,
			3.63118314743042,
			-0.36511772871017456,
			0.19418928027153015,
			0.6548966765403748,
			0.730307936668396,
			0.45286643505096436,
			0.23794734477996826,
			-1.6026275157928467,
			4.007314682006836,
			-0.22187906503677368,
			0.5825067758560181,
			0.7680593132972717,
			0.26593828201293945,
			0.416818767786026,
			0.10526037216186523,
			-1.1826281547546387,
			3.5908045768737793,
			-0.3083234429359436,
			-0.041657764464616776,
			0.047120578587055206,
			0.9980162978172302,
			0.5080015659332275,
			0.23794734477996826,
			-1.6255427598953247,
			3.990518569946289,
			-0.1991782933473587,
			0.47074800729751587,
			-0.1517990678548813,
			0.869106113910675,
			0.436437726020813,
			0.10526037216186523,
			-1.2122904062271118,
			3.5384209156036377,
			-0.3279809355735779,
			-0.5690481066703796,
			-0.6124759912490845,
			0.5486617684364319,
			0.5480327010154724,
			0.23794734477996826,
			-1.6603978872299194,
			3.986182451248169,
			-0.2081039398908615,
			-0.18720053136348724,
			-0.8908963203430176,
			0.4138004779815674,
			0.4600883722305298,
			0.10526037216186523,
			-1.036268949508667,
			3.634066581726074,
			-0.45097607374191284,
			0.8709677457809448,
			0.47904905676841736,
			-0.10885952413082123,
			0.2916446030139923,
			0.25,
			-1.0710339546203613,
			3.6495933532714844,
			-0.3964460492134094,
			0.4674520194530487,
			0.5696890354156494,
			0.6759239435195923,
			0.3127717971801758,
			0.25,
			-0.9817267656326294,
			4.009723663330078,
			-0.642510712146759,
			0.8397473096847534,
			0.1109958216547966,
			0.5314798355102539,
			0.3127717971801758,
			0.17622798681259155,
			-0.9906798601150513,
			3.99088716506958,
			-0.678476870059967,
			0.7405316233634949,
			-0.6453443765640259,
			-0.18735313415527344,
			0.2916446030139923,
			0.17622798681259155,
			-1.0781121253967285,
			3.6151480674743652,
			-0.5073179006576538,
			0.5257728695869446,
			0.0718405693769455,
			-0.8475600481033325,
			0.42801111936569214,
			0.25,
			-1.036268949508667,
			3.634066581726074,
			-0.45097607374191284,
			0.8709677457809448,
			0.47904905676841736,
			-0.10885952413082123,
			0.4549002945423126,
			0.25,
			-0.9906798601150513,
			3.99088716506958,
			-0.678476870059967,
			0.7405316233634949,
			-0.6453443765640259,
			-0.18735313415527344,
			0.4549002945423126,
			0.17622798681259155,
			-1.025438904762268,
			3.9959325790405273,
			-0.7084856629371643,
			0.10977508127689362,
			-0.6455580592155457,
			-0.7557603716850281,
			0.42801111936569214,
			0.17622798681259155,
			-1.1441471576690674,
			3.63118314743042,
			-0.36511772871017456,
			0.19418928027153015,
			0.6548966765403748,
			0.730307936668396,
			0.32813704013824463,
			0.25,
			-1.2018728256225586,
			3.643829345703125,
			-0.4416196346282959,
			-0.16556291282176971,
			0.9861140847206116,
			-0.01077303383499384,
			0.3569468855857849,
			0.25,
			-1.0424938201904297,
			4.051427841186523,
			-0.653645932674408,
			-0.44840845465660095,
			0.7554551959037781,
			0.4776757061481476,
			0.3569468855857849,
			0.17622798681259155,
			-1.0055742263793945,
			4.040928840637207,
			-0.6280036568641663,
			0.29108554124832153,
			0.7280800938606262,
			0.6205939054489136,
			0.32813704013824463,
			0.17622798681259155,
			-1.1717512607574463,
			3.633131265640259,
			-0.5266577005386353,
			-0.3806573748588562,
			-0.21964171528816223,
			-0.8982207775115967,
			0.40112194418907166,
			0.25,
			-1.0604337453842163,
			4.01731538772583,
			-0.7156352400779724,
			-0.5441755652427673,
			-0.1580858826637268,
			-0.8239082098007202,
			0.40112194418907166,
			0.17622798681259155,
			-1.2106223106384277,
			3.614321231842041,
			-0.4695281386375427,
			-0.430768758058548,
			0.02542191743850708,
			-0.9020966291427612,
			0.3799947500228882,
			0.25,
			-1.06911301612854,
			4.045259475708008,
			-0.6896560192108154,
			-0.9079867005348206,
			0.41685232520103455,
			-0.041718803346157074,
			0.3799947500228882,
			0.17622798681259155,
			-0.7719076871871948,
			3.9918274879455566,
			-0.8583344221115112,
			0.27454450726509094,
			0.9610278606414795,
			0.031342510133981705,
			0.35953062772750854,
			0.08028912544250488,
			-0.7639338970184326,
			3.982696056365967,
			-0.8445499539375305,
			0.5316629409790039,
			0.6124454736709595,
			0.5849788188934326,
			0.3413960039615631,
			0.08028912544250488,
			-0.7595559358596802,
			3.966984748840332,
			-0.8478982448577881,
			0.25086215138435364,
			-0.5857722759246826,
			0.7706534266471863,
			0.33172422647476196,
			0.08028912544250488,
			-0.7770620584487915,
			3.9805212020874023,
			-0.8845686912536621,
			-0.35169529914855957,
			-0.005737479776144028,
			-0.9360637068748474,
			0.38733696937561035,
			0.08028912544250488,
			-0.7780865430831909,
			3.992889642715454,
			-0.875182032585144,
			-0.03018280491232872,
			0.8594317436218262,
			-0.5103304982185364,
			0.3740382790565491,
			0.08028912544250488,
			-0.7618857622146606,
			3.9605207443237305,
			-0.8629366755485535,
			-0.1905880868434906,
			-0.9761040210723877,
			0.10431226342916489,
			0.3184255361557007,
			0.08028912544250488,
			-0.7618857622146606,
			3.9605207443237305,
			-0.8629366755485535,
			-0.1905880868434906,
			-0.9761040210723877,
			0.10431226342916489,
			0.42118823528289795,
			0.08028912544250488,
			-0.7695777416229248,
			3.967184066772461,
			-0.8782320618629456,
			-0.3661305606365204,
			-0.8126468658447266,
			-0.4533219337463379,
			0.40426260232925415,
			0.08028912544250488,
			-1.0424938201904297,
			4.051427841186523,
			-0.653645932674408,
			-0.44840845465660095,
			0.7554551959037781,
			0.4776757061481476,
			0.3297562897205353,
			0.20868659019470215,
			-1.0874528884887695,
			4.230137825012207,
			-0.794842541217804,
			-0.5982543230056763,
			0.3972899615764618,
			0.69582200050354,
			0.3314477205276489,
			0.03304523229598999,
			-1.0735032558441162,
			4.23621129989624,
			-0.7926774024963379,
			0.26468703150749207,
			0.6682637929916382,
			0.69521164894104,
			0.31629544496536255,
			0.03304523229598999,
			-1.0055742263793945,
			4.040928840637207,
			-0.6280036568641663,
			0.29108554124832153,
			0.7280800938606262,
			0.6205939054489136,
			0.3159677982330322,
			0.20868659019470215,
			-1.063844084739685,
			4.232630252838135,
			-0.8020665645599365,
			0.9351786971092224,
			0.35413679480552673,
			0.002533036284148693,
			0.30267077684402466,
			0.03304523229598999,
			-0.9817267656326294,
			4.009723663330078,
			-0.642510712146759,
			0.8397473096847534,
			0.1109958216547966,
			0.5314798355102539,
			0.3008522093296051,
			0.20868659019470215,
			-1.0604337453842163,
			4.01731538772583,
			-0.7156352400779724,
			-0.5441755652427673,
			-0.1580858826637268,
			-0.8239082098007202,
			0.3605695962905884,
			0.20868659019470215,
			-1.0931396484375,
			4.215152740478516,
			-0.813108503818512,
			-0.6680806875228882,
			-0.4191412031650543,
			-0.6147343516349792,
			0.35914283990859985,
			0.03304523229598999,
			-1.0971518754959106,
			4.221536159515381,
			-0.8024851679801941,
			-0.964568018913269,
			0.021912289783358574,
			0.2628253996372223,
			0.34631097316741943,
			0.03304523229598999,
			-1.06911301612854,
			4.045259475708008,
			-0.6896560192108154,
			-0.9079867005348206,
			0.41685232520103455,
			-0.041718803346157074,
			0.3454214930534363,
			0.20868659019470215,
			-1.067014455795288,
			4.224484443664551,
			-0.8127987384796143,
			0.8127079010009766,
			-0.0636005699634552,
			-0.5791803002357483,
			0.28930535912513733,
			0.03304523229598999,
			-0.9906798601150513,
			3.99088716506958,
			-0.678476870059967,
			0.7405316233634949,
			-0.6453443765640259,
			-0.18735313415527344,
			0.2855721116065979,
			0.20868659019470215,
			-0.9906798601150513,
			3.99088716506958,
			-0.678476870059967,
			0.7405316233634949,
			-0.6453443765640259,
			-0.18735313415527344,
			0.39227294921875,
			0.20868659019470215,
			-1.067014455795288,
			4.224484443664551,
			-0.8127987384796143,
			0.8127079010009766,
			-0.0636005699634552,
			-0.5791803002357483,
			0.3862029016017914,
			0.03304523229598999,
			-1.0799789428710938,
			4.217291831970215,
			-0.8168880939483643,
			0.2594073414802551,
			-0.37598803639411926,
			-0.8895534873008728,
			0.37213680148124695,
			0.03304523229598999,
			-1.025438904762268,
			3.9959325790405273,
			-0.7084856629371643,
			0.10977508127689362,
			-0.6455580592155457,
			-0.7557603716850281,
			0.37487345933914185,
			0.20868659019470215,
			0.20315802097320557,
			3.7818636894226074,
			1.115983247756958,
			-0.9310587048530579,
			0.2861415445804596,
			0.22629474103450775,
			0.3984580934047699,
			0.25,
			0.2660767734050751,
			3.810084104537964,
			1.0603947639465332,
			-0.5414593815803528,
			0.40281379222869873,
			-0.7379070520401001,
			0.43784961104393005,
			0.25,
			0.2733703851699829,
			4.058115005493164,
			1.048043966293335,
			-0.49491867423057556,
			-0.4663838744163513,
			-0.7331156134605408,
			0.43784961104393005,
			0.12890625,
			0.2427891492843628,
			4.061187267303467,
			1.0936484336853027,
			-0.9696950912475586,
			-0.2061830461025238,
			0.13086336851119995,
			0.3984580934047699,
			0.12890625,
			0.33329102396965027,
			3.727445602416992,
			1.1272468566894531,
			0.1508529931306839,
			0.7950071692466736,
			0.5874813199043274,
			0.325302392244339,
			0.25,
			0.26033177971839905,
			3.7163121700286865,
			1.170473337173462,
			-0.6281930208206177,
			0.05496383458375931,
			0.7760856747627258,
			0.368445485830307,
			0.25,
			0.2658824324607849,
			4.05665397644043,
			1.1381410360336304,
			-0.13803522288799286,
			0.4363536536693573,
			0.8890957236289978,
			0.368445485830307,
			0.12890625,
			0.32779762148857117,
			4.027278900146484,
			1.1284027099609375,
			0.5236670970916748,
			0.32984405755996704,
			0.7854548692703247,
			0.325302392244339,
			0.12890625,
			0.3573836386203766,
			3.8017666339874268,
			1.0318492650985718,
			0.38520461320877075,
			0.39149144291877747,
			-0.8356578350067139,
			0.482868492603302,
			0.25,
			0.33348822593688965,
			4.040389060974121,
			1.0428473949432373,
			0.4540849030017853,
			0.020874660462141037,
			-0.8906826972961426,
			0.482868492603302,
			0.12890625,
			0.4062502384185791,
			3.738579273223877,
			1.084020733833313,
			0.9033173322677612,
			0.4034852087497711,
			-0.14542070031166077,
			0.2840350866317749,
			0.25,
			0.3590333163738251,
			4.042384624481201,
			1.0809379816055298,
			0.8901333808898926,
			0.4447157084941864,
			0.09921567142009735,
			0.2840350866317749,
			0.12890625,
			0.3573836386203766,
			3.8017666339874268,
			1.0318492650985718,
			0.38520461320877075,
			0.39149144291877747,
			-0.8356578350067139,
			0.25589826703071594,
			0.25,
			0.33348822593688965,
			4.040389060974121,
			1.0428473949432373,
			0.4540849030017853,
			0.020874660462141037,
			-0.8906826972961426,
			0.25589826703071594,
			0.12890625,
			0.32183557748794556,
			3.6623129844665527,
			1.2068206071853638,
			-0.05246131867170334,
			-0.8172856569290161,
			0.573809027671814,
			0.4316714406013489,
			0.24524784088134766,
			0.26033177971839905,
			3.7163121700286865,
			1.170473337173462,
			-0.6281930208206177,
			0.05496383458375931,
			0.7760856747627258,
			0.5071548223495483,
			0.24524784088134766,
			0.3236549496650696,
			3.7387728691101074,
			1.371728777885437,
			-0.9865413308143616,
			-0.14477980136871338,
			0.07559435069561005,
			0.5071548223495483,
			0.14722108840942383,
			0.3510737717151642,
			3.729419469833374,
			1.3823328018188477,
			0.15308085083961487,
			-0.965086817741394,
			-0.21237830817699432,
			0.4316714406013489,
			0.14722108840942383,
			0.4062502384185791,
			3.738579273223877,
			1.084020733833313,
			0.9033173322677612,
			0.4034852087497711,
			-0.14542070031166077,
			0.2958541810512543,
			0.24524784088134766,
			0.4347054362297058,
			3.6718697547912598,
			1.1487526893615723,
			0.9488204717636108,
			-0.24298837780952454,
			0.20160527527332306,
			0.36283233761787415,
			0.24524784088134766,
			0.3728981614112854,
			3.753791332244873,
			1.3705955743789673,
			0.9545579552650452,
			0.0794702023267746,
			0.287118136882782,
			0.36283233761787415,
			0.14722108840942383,
			0.35206812620162964,
			3.770866632461548,
			1.3722002506256104,
			0.2295602262020111,
			0.9363383650779724,
			0.26557207107543945,
			0.2958541810512543,
			0.14722108840942383,
			0.26033177971839905,
			3.7163121700286865,
			1.170473337173462,
			-0.6281930208206177,
			0.05496383458375931,
			0.7760856747627258,
			0.17416073381900787,
			0.24524784088134766,
			0.33329102396965027,
			3.727445602416992,
			1.1272468566894531,
			0.1508529931306839,
			0.7950071692466736,
			0.5874813199043274,
			0.23030492663383484,
			0.24524784088134766,
			0.32639166712760925,
			3.76423978805542,
			1.370349407196045,
			-0.4831995666027069,
			0.8644673228263855,
			0.13840143382549286,
			0.23030492663383484,
			0.14722108840942383,
			0.3236549496650696,
			3.7387728691101074,
			1.371728777885437,
			-0.9865413308143616,
			-0.14477980136871338,
			0.07559435069561005,
			0.17416073381900787,
			0.14722108840942383,
			0.13424614071846008,
			4.261411666870117,
			0.8815014958381653,
			0.23371075093746185,
			-0.4427625238895416,
			-0.8655964732170105,
			0.482868492603302,
			0.0,
			0.10762092471122742,
			4.26202392578125,
			0.8837814927101135,
			-0.4863429665565491,
			-0.7448957562446594,
			-0.45664846897125244,
			0.43784961104393005,
			0.0,
			0.10479222238063812,
			4.283081531524658,
			0.915803074836731,
			-0.6209906339645386,
			0.2598956227302551,
			0.7394329905509949,
			0.368445485830307,
			0.0,
			0.13369113206863403,
			4.2777180671691895,
			0.9145606160163879,
			0.41685232520103455,
			0.765770435333252,
			0.48966947197914124,
			0.325302392244339,
			0.0,
			0.14429350197315216,
			4.274270057678223,
			0.8921973705291748,
			0.7935117483139038,
			0.5804315209388733,
			-0.1826532781124115,
			0.2840350866317749,
			0.0,
			0.13424614071846008,
			4.261411666870117,
			0.8815014958381653,
			0.23371075093746185,
			-0.4427625238895416,
			-0.8655964732170105,
			0.25589826703071594,
			0.0,
			0.09486695379018784,
			4.271040916442871,
			0.9011695384979248,
			-0.8484450578689575,
			-0.52214115858078,
			0.08633686602115631,
			0.3984580934047699,
			0.0,
			-0.4338710904121399,
			3.867410898208618,
			-0.9671831727027893,
			0.1676076501607895,
			0.8391674757003784,
			-0.5173802971839905,
			0.371243953704834,
			0.0,
			-0.4287956953048706,
			3.8665382862091064,
			-0.9533444046974182,
			0.3785210847854614,
			0.9105197191238403,
			0.1662343144416809,
			0.36590859293937683,
			0.0,
			-0.41864967346191406,
			3.846132278442383,
			-0.944771945476532,
			-0.062227241694927216,
			-0.7252113223075867,
			0.6856593489646912,
			0.35568246245384216,
			0.0,
			-0.42056336998939514,
			3.840822696685791,
			-0.9571247100830078,
			-0.299630731344223,
			-0.9467757344245911,
			0.11737418919801712,
			0.35079169273376465,
			0.0,
			-0.42056336998939514,
			3.840822696685791,
			-0.9571247100830078,
			-0.299630731344223,
			-0.9467757344245911,
			0.11737418919801712,
			0.3885838985443115,
			0.0,
			-0.4268818199634552,
			3.8462958335876465,
			-0.9696884751319885,
			-0.3978392779827118,
			-0.82631915807724,
			-0.3985717296600342,
			0.3823592960834503,
			0.0,
			-0.43302953243255615,
			3.8572511672973633,
			-0.9748935699462891,
			-0.32035279273986816,
			-0.21875667572021484,
			-0.921658992767334,
			0.3761346936225891,
			0.0,
			-0.4222458600997925,
			3.859037399291992,
			-0.9420216083526611,
			0.3484908640384674,
			0.25119784474372864,
			0.9029816389083862,
			0.3592393696308136,
			0.0,
			-1.8513681888580322,
			4.0726470947265625,
			0.054666027426719666,
			0.6764122247695923,
			0.5660878419876099,
			0.47114473581314087,
			0.3852425515651703,
			0.0201684832572937,
			-1.8622655868530273,
			4.069287300109863,
			0.03599933534860611,
			0.15448468923568726,
			0.9870601296424866,
			-0.04260383918881416,
			0.3699048161506653,
			0.0201684832572937,
			-1.8608797788619995,
			4.039679527282715,
			0.06234971433877945,
			0.09973448514938354,
			-0.9565721750259399,
			0.27384257316589355,
			0.41295531392097473,
			0.0201684832572937,
			-1.8513531684875488,
			4.056798934936523,
			0.06732840090990067,
			0.6053651571273804,
			-0.49562060832977295,
			0.6227607131004333,
			0.3976101875305176,
			0.0201684832572937,
			-1.8775660991668701,
			4.041476726531982,
			0.026102542877197266,
			-0.8119754791259766,
			-0.24384288489818573,
			-0.5302896499633789,
			0.33999907970428467,
			0.0201684832572937,
			-1.8720282316207886,
			4.033468246459961,
			0.04431468993425369,
			-0.33817559480667114,
			-0.9367961883544922,
			-0.08963286131620407,
			0.32695862650871277,
			0.0201684832572937,
			-1.8721011877059937,
			4.059798717498779,
			0.023311298340559006,
			-0.3194677531719208,
			0.8824732303619385,
			-0.34516432881355286,
			0.3561120331287384,
			0.0201684832572937,
			-1.8608797788619995,
			4.039679527282715,
			0.06234971433877945,
			0.09973448514938354,
			-0.9565721750259399,
			0.27384257316589355,
			0.31139808893203735,
			0.0201684832572937,
			0.3779471218585968,
			3.5867085456848145,
			1.6207365989685059,
			0.9905697703361511,
			0.1266212910413742,
			0.052034057676792145,
			0.36283233761787415,
			0.005031406879425049,
			0.36394578218460083,
			3.5921428203582764,
			1.6309033632278442,
			0.18463698029518127,
			0.8129825592041016,
			0.5522019267082214,
			0.2958541810512543,
			0.005031406879425049,
			0.34668681025505066,
			3.5907223224639893,
			1.6265021562576294,
			-0.6459853053092957,
			0.6058839559555054,
			0.46430858969688416,
			0.23030492663383484,
			0.005031406879425049,
			0.34484729170799255,
			3.5805020332336426,
			1.6127383708953857,
			-0.8357799053192139,
			-0.4842982292175293,
			-0.25861385464668274,
			0.5071548223495483,
			0.005031406879425049,
			0.363277405500412,
			3.5710887908935547,
			1.6114288568496704,
			0.27448347210884094,
			-0.7938779592514038,
			-0.5425275564193726,
			0.4316714406013489,
			0.005031406879425049,
			0.34484729170799255,
			3.5805020332336426,
			1.6127383708953857,
			-0.8357799053192139,
			-0.4842982292175293,
			-0.25861385464668274,
			0.17416073381900787,
			0.005031406879425049,
			0.5301733613014221,
			3.5236053466796875,
			-0.659159779548645,
			0.17163610458374023,
			-0.7932065725326538,
			-0.5842463374137878,
			0.12033828347921371,
			0.24593710899353027,
			0.5857326984405518,
			3.5244290828704834,
			-0.5975998044013977,
			0.7084566950798035,
			-0.7000030279159546,
			-0.08960234373807907,
			0.17112894356250763,
			0.24593710899353027,
			0.9046679139137268,
			3.6508193016052246,
			-0.5807479619979858,
			-0.015564439818263054,
			-0.9664296507835388,
			0.2563554644584656,
			0.19035416841506958,
			0.16389107704162598,
			0.8693166971206665,
			3.65358829498291,
			-0.6557131409645081,
			0.29636523127555847,
			-0.7621692419052124,
			-0.5755180716514587,
			0.14587150514125824,
			0.16389107704162598,
			0.41574627161026,
			3.714395523071289,
			-0.5933435559272766,
			-0.5282143354415894,
			0.8484145402908325,
			-0.03415021300315857,
			0.43622156977653503,
			0.24593710899353027,
			0.40780454874038696,
			3.6931393146514893,
			-0.6275232434272766,
			-0.731315016746521,
			0.5952940583229065,
			-0.3328043520450592,
			0.4633769094944,
			0.24593710899353027,
			0.8195905685424805,
			3.8566315174102783,
			-0.6876130700111389,
			0.10596026480197906,
			0.8338877558708191,
			-0.5416424870491028,
			0.4463060796260834,
			0.16389107704162598,
			0.8270034790039062,
			3.881701946258545,
			-0.6559951901435852,
			0.05178990960121155,
			0.9780877232551575,
			-0.20157475769519806,
			0.4225233495235443,
			0.16389107704162598,
			0.5576097965240479,
			3.668100595474243,
			-0.48497825860977173,
			0.33671072125434875,
			0.5199743509292603,
			0.7849971055984497,
			0.31951507925987244,
			0.24593710899353027,
			0.4815760850906372,
			3.7123427391052246,
			-0.5234359502792358,
			-0.1345866322517395,
			0.8825342655181885,
			0.4505447447299957,
			0.3770456314086914,
			0.24593710899353027,
			0.8684093952178955,
			3.874920606613159,
			-0.5695982575416565,
			0.040742211043834686,
			0.9020966291427612,
			0.4295175075531006,
			0.3706968128681183,
			0.16389107704162598,
			0.9096923470497131,
			3.818612575531006,
			-0.5037004947662354,
			-0.14383374154567719,
			0.37794122099876404,
			0.9145786762237549,
			0.3203113377094269,
			0.16389107704162598,
			0.4483543038368225,
			3.578489303588867,
			-0.7006768584251404,
			-0.5010834336280823,
			-0.42243722081184387,
			-0.7552415728569031,
			0.054575540125370026,
			0.24593710899353027,
			0.8277792930603027,
			3.720761775970459,
			-0.727773129940033,
			0.24918362498283386,
			-0.13748589158058167,
			-0.9586169123649597,
			0.08827624469995499,
			0.16389107704162598,
			0.6015688180923462,
			3.5860061645507812,
			-0.5275284051895142,
			0.791558563709259,
			-0.21112704277038574,
			0.573442816734314,
			0.24158188700675964,
			0.24593710899353027,
			0.926531970500946,
			3.718726634979248,
			-0.5185952186584473,
			-0.29810479283332825,
			-0.45622119307518005,
			0.8384349942207336,
			0.25205713510513306,
			0.16389107704162598,
			0.39986294507980347,
			3.6718835830688477,
			-0.6617036461830139,
			-0.764976978302002,
			0.3334452211856842,
			-0.5509811639785767,
			0.4912281930446625,
			0.24593710899353027,
			0.4483543038368225,
			3.578489303588867,
			-0.7006768584251404,
			-0.5010834336280823,
			-0.42243722081184387,
			-0.7552415728569031,
			0.5712270140647888,
			0.24593710899353027,
			0.8277792930603027,
			3.720761775970459,
			-0.727773129940033,
			0.24918362498283386,
			-0.13748589158058167,
			-0.9586169123649597,
			0.5407616496086121,
			0.16389107704162598,
			0.8121782541275024,
			3.831561326980591,
			-0.7192313075065613,
			0.09372234344482422,
			0.5833002924919128,
			-0.8068178296089172,
			0.47069835662841797,
			0.16389107704162598,
			1.2346267700195312,
			3.686786651611328,
			-0.43927228450775146,
			0.8416699767112732,
			0.4110232889652252,
			-0.3501388728618622,
			0.4432307779788971,
			0.08407813310623169,
			1.223430871963501,
			3.697866678237915,
			-0.4251355826854706,
			0.6557512283325195,
			0.7468794584274292,
			-0.11011078208684921,
			0.42346644401550293,
			0.08407813310623169,
			1.1554206609725952,
			3.5904483795166016,
			-0.41646191477775574,
			-0.28952908515930176,
			-0.9568163156509399,
			0.025666065514087677,
			0.21607626974582672,
			0.08407813310623169,
			1.1878291368484497,
			3.5964393615722656,
			-0.4437405467033386,
			0.33036285638809204,
			-0.8815576434135437,
			-0.33713796734809875,
			0.18003329634666443,
			0.08407813310623169,
			1.1745027303695679,
			3.7002716064453125,
			-0.38007688522338867,
			-0.0632648691534996,
			0.9170507192611694,
			0.39368876814842224,
			0.362202525138855,
			0.08407813310623169,
			1.1403083801269531,
			3.6683759689331055,
			-0.3637489080429077,
			-0.7291787266731262,
			0.3893551528453827,
			0.5627002716064453,
			0.3213766813278198,
			0.08407813310623169,
			1.2122353315353394,
			3.708946943283081,
			-0.4109984040260315,
			0.4943693280220032,
			0.8675496578216553,
			0.05417035520076752,
			0.40419599413871765,
			0.08407813310623169,
			1.2263790369033813,
			3.6329073905944824,
			-0.4587777853012085,
			0.7771233320236206,
			-0.33933529257774353,
			-0.5299538969993591,
			0.13336557149887085,
			0.08407813310623169,
			1.1366958618164062,
			3.6187031269073486,
			-0.3813380002975464,
			-0.8213446736335754,
			-0.460615873336792,
			0.33643603324890137,
			0.2660723328590393,
			0.08407813310623169,
			1.2263790369033813,
			3.6329073905944824,
			-0.4587777853012085,
			0.7771233320236206,
			-0.33933529257774353,
			-0.5299538969993591,
			0.5000009536743164,
			0.08407813310623169,
			1.5817644596099854,
			3.52407169342041,
			0.008609950542449951,
			0.9837946891784668,
			-0.12497329711914062,
			0.12839137017726898,
			0.4425317645072937,
			0.0006442070007324219,
			1.5769952535629272,
			3.5405216217041016,
			0.003113865852355957,
			0.8598284721374512,
			0.5015106797218323,
			0.095583975315094,
			0.4045037627220154,
			0.0006442070007324219,
			1.5495920181274414,
			3.520841598510742,
			0.026760578155517578,
			-0.22351756691932678,
			-0.22830897569656372,
			0.9475691914558411,
			0.28583261370658875,
			0.0006442070007324219,
			1.5612542629241943,
			3.5114150047302246,
			0.024490058422088623,
			0.16144292056560516,
			-0.6407666206359863,
			0.7505416870117188,
			0.2523423135280609,
			0.0006442070007324219,
			1.57132089138031,
			3.5437374114990234,
			0.003954648971557617,
			0.5693227648735046,
			0.7227698564529419,
			0.39170506596565247,
			0.3912644684314728,
			0.0006442070007324219,
			1.5727232694625854,
			3.5128893852233887,
			0.017933428287506104,
			0.696035623550415,
			-0.574449896812439,
			0.430677205324173,
			0.2281985878944397,
			0.0006442070007324219,
			1.5525399446487427,
			3.544717788696289,
			0.012558400630950928,
			0.09732352942228317,
			0.7227393388748169,
			0.6841944456100464,
			0.3502262830734253,
			0.0006442070007324219,
			1.5441416501998901,
			3.5353851318359375,
			0.0214574933052063,
			-0.26541948318481445,
			0.3336588740348816,
			0.904538094997406,
			0.32287871837615967,
			0.0006442070007324219,
			1.5656466484069824,
			3.5469532012939453,
			0.004795551300048828,
			0.4389171898365021,
			0.8015381097793579,
			0.4060182571411133,
			0.3783559799194336,
			0.0006442070007324219,
			1.5817644596099854,
			3.52407169342041,
			0.008609950542449951,
			0.9837946891784668,
			-0.12497329711914062,
			0.12839137017726898,
			0.19693779945373535,
			0.0006442070007324219,
			1.2263790369033813,
			3.6329073905944824,
			-0.4587777853012085,
			0.7771233320236206,
			-0.33933529257774353,
			-0.5299538969993591,
			0.5336294174194336,
			0.2446092963218689,
			1.0986688137054443,
			3.4682672023773193,
			0.24692916870117188,
			0.7418134212493896,
			-0.31992554664611816,
			0.5893429517745972,
			0.4547405242919922,
			0.002229034900665283,
			1.093785285949707,
			3.49826717376709,
			0.24459052085876465,
			0.7097994685173035,
			0.2381664514541626,
			0.6628620028495789,
			0.42959392070770264,
			0.002229034900665283,
			1.2346267700195312,
			3.686786651611328,
			-0.43927228450775146,
			0.8416699767112732,
			0.4110232889652252,
			-0.3501388728618622,
			0.4820306897163391,
			0.2446092963218689,
			1.1366958618164062,
			3.6187031269073486,
			-0.3813380002975464,
			-0.8213446736335754,
			-0.460615873336792,
			0.33643603324890137,
			0.3373975157737732,
			0.2446092963218689,
			1.03727126121521,
			3.4590818881988525,
			0.2566646933555603,
			-0.7527695298194885,
			-0.17862483859062195,
			0.6335642337799072,
			0.34140872955322266,
			0.002229034900665283,
			1.0573222637176514,
			3.4431824684143066,
			0.2542523145675659,
			-0.3733634352684021,
			-0.6914883852005005,
			0.6183660626411438,
			0.31851664185523987,
			0.002229034900665283,
			1.1554206609725952,
			3.5904483795166016,
			-0.41646191477775574,
			-0.28952908515930176,
			-0.9568163156509399,
			0.025666065514087677,
			0.3028064966201782,
			0.2446092963218689,
			1.0841811895370483,
			3.5039212703704834,
			0.24465149641036987,
			0.491561621427536,
			0.4203619360923767,
			0.7626270055770874,
			0.41853344440460205,
			0.002229034900665283,
			1.223430871963501,
			3.697866678237915,
			-0.4251355826854706,
			0.6557512283325195,
			0.7468794584274292,
			-0.11011078208684921,
			0.4660381078720093,
			0.2446092963218689,
			1.0792535543441772,
			3.447021722793579,
			0.2508174777030945,
			0.37040314078330994,
			-0.7149571180343628,
			0.5929441452026367,
			0.2993326783180237,
			0.002229034900665283,
			1.1878291368484497,
			3.5964393615722656,
			-0.4437405467033386,
			0.33036285638809204,
			-0.8815576434135437,
			-0.33713796734809875,
			0.2770020067691803,
			0.2446092963218689,
			1.1745027303695679,
			3.7002716064453125,
			-0.38007688522338867,
			-0.0632648691534996,
			0.9170507192611694,
			0.39368876814842224,
			0.4203520119190216,
			0.2446092963218689,
			1.0493770837783813,
			3.5041663646698,
			0.24876642227172852,
			-0.2559892535209656,
			0.6687215566635132,
			0.6980193257331848,
			0.3857145607471466,
			0.002229034900665283,
			1.031204104423523,
			3.486013174057007,
			0.2532883882522583,
			-0.7346110343933105,
			0.32206183671951294,
			0.5971251726150513,
			0.36488643288612366,
			0.002229034900665283,
			1.1403083801269531,
			3.6683759689331055,
			-0.3637489080429077,
			-0.7291787266731262,
			0.3893551528453827,
			0.5627002716064453,
			0.38437387347221375,
			0.2446092963218689,
			1.2122353315353394,
			3.708946943283081,
			-0.4109984040260315,
			0.4943693280220032,
			0.8675496578216553,
			0.05417035520076752,
			0.4500056207180023,
			0.2446092963218689,
			1.0745772123336792,
			3.509575366973877,
			0.24471169710159302,
			0.2713095545768738,
			0.6456496119499207,
			0.713797390460968,
			0.4076595902442932,
			0.002229034900665283,
			1.0986688137054443,
			3.4682672023773193,
			0.24692916870117188,
			0.7418134212493896,
			-0.31992554664611816,
			0.5893429517745972,
			0.27507033944129944,
			0.002229034900665283,
			1.2263790369033813,
			3.6329073905944824,
			-0.4587777853012085,
			0.7771233320236206,
			-0.33933529257774353,
			-0.5299538969993591,
			0.23375128209590912,
			0.2446092963218689,
			0.1763743758201599,
			3.2002391815185547,
			0.448516845703125,
			0.8198797702789307,
			0.3717764914035797,
			-0.4353465437889099,
			0.03455406427383423,
			0.24021095037460327,
			-0.5712485313415527,
			3.8246731758117676,
			0.4486902356147766,
			0.4695272743701935,
			0.6052430868148804,
			-0.6427808403968811,
			0.09690713882446289,
			0.10277628898620605,
			-0.6506553888320923,
			3.765913248062134,
			0.419018030166626,
			-0.11346781998872757,
			0.043336283415555954,
			-0.9925839900970459,
			0.16020463407039642,
			0.10277628898620605,
			0.026193473488092422,
			3.217660903930664,
			0.38900226354599,
			0.08124027401208878,
			0.44697409868240356,
			-0.8908352851867676,
			0.1164628118276596,
			0.24021095037460327,
			-0.11564496159553528,
			3.1294870376586914,
			0.6902139782905579,
			-0.5378581881523132,
			-0.25690481066703796,
			0.8029114603996277,
			0.3407157063484192,
			0.24021095037460327,
			-0.7439101934432983,
			3.7797093391418457,
			0.6162880063056946,
			-0.443311870098114,
			-0.40214240550994873,
			0.8010803461074829,
			0.33350294828414917,
			0.10277628898620605,
			-0.6556603908538818,
			3.8368587493896484,
			0.6264066100120544,
			0.2222357839345932,
			0.1897640973329544,
			0.9563280344009399,
			0.39483433961868286,
			0.10277628898620605,
			0.04785935953259468,
			3.1208231449127197,
			0.719810962677002,
			0.1355021893978119,
			-0.3090914487838745,
			0.9413129091262817,
			0.4200802743434906,
			0.24021095037460327,
			0.20460622012615204,
			3.1529605388641357,
			0.6100253462791443,
			0.9345072507858276,
			-0.09097567945718765,
			0.34403514862060547,
			0.5163111090660095,
			0.24021095037460327,
			-0.564000129699707,
			3.864861488342285,
			0.5490203499794006,
			0.6619464755058289,
			0.6974700093269348,
			0.27445295453071594,
			0.46919965744018555,
			0.10277628898620605,
			-0.5712485313415527,
			3.8246731758117676,
			0.4486902356147766,
			0.4695272743701935,
			0.6052430868148804,
			-0.6427808403968811,
			0.5384186506271362,
			0.10277628898620605,
			0.1763743758201599,
			3.2002391815185547,
			0.448516845703125,
			0.8198797702789307,
			0.3717764914035797,
			-0.4353465437889099,
			0.6058824062347412,
			0.24021095037460327,
			-0.7276114225387573,
			3.7338778972625732,
			0.4600939154624939,
			-0.5483871102333069,
			-0.3969237208366394,
			-0.7359843850135803,
			0.21671773493289948,
			0.10277628898620605,
			-0.10896281152963638,
			3.201862335205078,
			0.442971408367157,
			-0.6390575766563416,
			0.17709891498088837,
			-0.748466432094574,
			0.1895923614501953,
			0.24021095037460327,
			-0.7735918760299683,
			3.729438543319702,
			0.5322978496551514,
			-0.773949384689331,
			-0.6294747591018677,
			-0.06872768700122833,
			0.27068278193473816,
			0.10277628898620605,
			-0.184422567486763,
			3.1675705909729004,
			0.5495653748512268,
			-0.9811395406723022,
			-0.19168676435947418,
			-0.0236823633313179,
			0.2594246566295624,
			0.24021095037460327,
			-1.0072025060653687,
			4.29295539855957,
			0.583888590335846,
			0.41499069333076477,
			0.5825372934341431,
			-0.6988433599472046,
			0.13546441495418549,
			0.005649209022521973,
			-1.0618436336517334,
			4.274096488952637,
			0.5665257573127747,
			-0.2464369684457779,
			0.08304086327552795,
			-0.965575098991394,
			0.18725328147411346,
			0.005649209022521973,
			-1.1114766597747803,
			4.298169136047363,
			0.6819599270820618,
			-0.39423811435699463,
			-0.3876766264438629,
			0.8332163691520691,
			0.32904282212257385,
			0.005649209022521973,
			-1.0521821975708008,
			4.314577102661133,
			0.6878808736801147,
			0.174016535282135,
			0.02227851189672947,
			0.9844660758972168,
			0.3792230486869812,
			0.005649209022521973,
			-0.9961011409759521,
			4.314116477966309,
			0.6425976753234863,
			0.6988128423690796,
			0.5821100473403931,
			0.41563159227371216,
			0.4400673806667328,
			0.005649209022521973,
			-1.0072025060653687,
			4.29295539855957,
			0.583888590335846,
			0.41499069333076477,
			0.5825372934341431,
			-0.6988433599472046,
			0.49670112133026123,
			0.005649209022521973,
			-1.1104246377944946,
			4.2697248458862305,
			0.5905616283416748,
			-0.6912137269973755,
			-0.334543913602829,
			-0.6405224800109863,
			0.23349127173423767,
			0.005649209022521973,
			-1.1368705034255981,
			4.275318622589111,
			0.6328123211860657,
			-0.7976927757263184,
			-0.5684072375297546,
			0.20142215490341187,
			0.27764448523521423,
			0.005649209022521973,
			0.5860277414321899,
			3.586315155029297,
			-0.8715293407440186,
			0.0954313799738884,
			-0.9093905687332153,
			-0.4047669768333435,
			0.3104752004146576,
			0.11673516035079956,
			0.43146759271621704,
			3.8268747329711914,
			-1.395804524421692,
			0.09619434177875519,
			-0.8950773477554321,
			-0.4353770613670349,
			0.30575031042099,
			0.04785585403442383,
			0.41811466217041016,
			3.828273057937622,
			-1.3918853998184204,
			-0.6918240785598755,
			-0.7077242136001587,
			-0.1429792195558548,
			0.2374913990497589,
			0.04785585403442383,
			0.5294072031974792,
			3.620990037918091,
			-0.9012512564659119,
			-0.633961021900177,
			-0.7170934081077576,
			-0.28949856758117676,
			0.2374434471130371,
			0.11673521995544434,
			0.6146290898323059,
			3.6960599422454834,
			-0.7745410799980164,
			0.7356792092323303,
			0.669515073299408,
			0.10245063900947571,
			0.4983130693435669,
			0.11673521995544434,
			0.4374275207519531,
			3.855921506881714,
			-1.3926124572753906,
			0.6713461875915527,
			0.7411114573478699,
			-0.0032044434919953346,
			0.4834955930709839,
			0.04785585403442383,
			0.4430633783340454,
			3.8446061611175537,
			-1.397039532661438,
			0.9446089267730713,
			0.2310861498117447,
			-0.23297829926013947,
			0.4212314188480377,
			0.04785585403442383,
			0.6413130164146423,
			3.636972188949585,
			-0.795151948928833,
			0.9968870878219604,
			0.07397686690092087,
			-0.02700887992978096,
			0.42883729934692383,
			0.11673527956008911,
			0.41105395555496216,
			3.840421438217163,
			-1.3876341581344604,
			-0.9841914176940918,
			-0.11227759718894958,
			0.13690602779388428,
			0.16561682522296906,
			0.04785585403442383,
			0.49962103366851807,
			3.6872472763061523,
			-0.8839582204818726,
			-0.9957579374313354,
			-0.02768028900027275,
			-0.0877101942896843,
			0.16049790382385254,
			0.11673521995544434,
			0.44054949283599854,
			3.8325035572052,
			-1.3976842164993286,
			0.8133792877197266,
			-0.3875240385532379,
			-0.43382060527801514,
			0.36055731773376465,
			0.04785585403442383,
			0.6265266537666321,
			3.5907557010650635,
			-0.8336551189422607,
			0.7622913122177124,
			-0.5921201109886169,
			-0.2612994909286499,
			0.3654451370239258,
			0.11673521995544434,
			0.41291511058807373,
			3.845417022705078,
			-1.3870147466659546,
			-0.9556871056556702,
			0.191503643989563,
			0.22351756691932678,
			0.13863442838191986,
			0.04785585403442383,
			0.5068785548210144,
			3.704072952270508,
			-0.8642857074737549,
			-0.8901028633117676,
			0.45512253046035767,
			-0.022858362644910812,
			0.13336396217346191,
			0.11673516035079956,
			0.5619395971298218,
			3.723897933959961,
			-0.801389753818512,
			0.1828974336385727,
			0.9753105044364929,
			0.12350840866565704,
			0.5532563924789429,
			0.11673521995544434,
			0.4255051016807556,
			3.8565292358398438,
			-1.388709306716919,
			0.03332621231675148,
			0.9761040210723877,
			0.2146672010421753,
			0.5347152948379517,
			0.04785585403442383,
			0.41477644443511963,
			3.8504130840301514,
			-1.3863955736160278,
			-0.711966335773468,
			0.6413159370422363,
			0.2859279215335846,
			0.11165587604045868,
			0.04785585403442383,
			0.5141359567642212,
			3.7208986282348633,
			-0.8446133136749268,
			-0.5468306541442871,
			0.8352916240692139,
			0.056794945150613785,
			0.10623443126678467,
			0.11673527956008911,
			0.5141359567642212,
			3.7208986282348633,
			-0.8446133136749268,
			-0.5468306541442871,
			0.8352916240692139,
			0.056794945150613785,
			0.598953127861023,
			0.11673521995544434,
			0.41477644443511963,
			3.8504130840301514,
			-1.3863955736160278,
			-0.711966335773468,
			0.6413159370422363,
			0.2859279215335846,
			0.5853884220123291,
			0.04785585403442383,
			0.41574627161026,
			3.714395523071289,
			-0.5933435559272766,
			-0.5282143354415894,
			0.8484145402908325,
			-0.03415021300315857,
			0.6125178337097168,
			0.18561464548110962,
			0.4815760850906372,
			3.7123427391052246,
			-0.5234359502792358,
			-0.1345866322517395,
			0.8825342655181885,
			0.4505447447299957,
			0.5717973709106445,
			0.18561464548110962,
			0.40780454874038696,
			3.6931393146514893,
			-0.6275232434272766,
			-0.731315016746521,
			0.5952940583229065,
			-0.3328043520450592,
			0.12809351086616516,
			0.18561464548110962,
			0.41574627161026,
			3.714395523071289,
			-0.5933435559272766,
			-0.5282143354415894,
			0.8484145402908325,
			-0.03415021300315857,
			0.10081298649311066,
			0.18561464548110962,
			0.5576097965240479,
			3.668100595474243,
			-0.48497825860977173,
			0.33671072125434875,
			0.5199743509292603,
			0.7849971055984497,
			0.5131305456161499,
			0.18561464548110962,
			0.5857326984405518,
			3.5244290828704834,
			-0.5975998044013977,
			0.7084566950798035,
			-0.7000030279159546,
			-0.08960234373807907,
			0.3703329563140869,
			0.18561464548110962,
			0.5301733613014221,
			3.5236053466796875,
			-0.659159779548645,
			0.17163610458374023,
			-0.7932065725326538,
			-0.5842463374137878,
			0.3152001202106476,
			0.18561464548110962,
			0.39986294507980347,
			3.6718835830688477,
			-0.6617036461830139,
			-0.764976978302002,
			0.3334452211856842,
			-0.5509811639785767,
			0.15537899732589722,
			0.18561464548110962,
			0.6015688180923462,
			3.5860061645507812,
			-0.5275284051895142,
			0.791558563709259,
			-0.21112704277038574,
			0.573442816734314,
			0.43644315004348755,
			0.18561464548110962,
			0.4483543038368225,
			3.578489303588867,
			-0.7006768584251404,
			-0.5010834336280823,
			-0.42243722081184387,
			-0.7552415728569031,
			0.2373955100774765,
			0.18561464548110962,
			0.610524594783783,
			3.638237714767456,
			-1.1670337915420532,
			-0.5122531652450562,
			-0.6632893085479736,
			0.5455183386802673,
			0.3931775987148285,
			0.6214362382888794,
			0.47778165340423584,
			3.5628180503845215,
			-1.3511277437210083,
			-0.4291512668132782,
			-0.5910519957542419,
			0.6829737424850464,
			0.4949337840080261,
			0.6364588737487793,
			0.3547264337539673,
			3.699439287185669,
			-1.2424918413162231,
			-0.34446242451667786,
			-0.7595141530036926,
			0.5517441034317017,
			0.4853841960430145,
			0.5503576993942261,
			0.5404874086380005,
			3.734300374984741,
			-1.0759155750274658,
			-0.44764548540115356,
			-0.766624927520752,
			0.4602801501750946,
			0.37702473998069763,
			0.5627982318401337,
			0.610524594783783,
			3.638237714767456,
			-1.1670337915420532,
			0.5122531652450562,
			0.6632893085479736,
			-0.5455183386802673,
			0.3931775987148285,
			0.6214362382888794,
			0.5404874086380005,
			3.734300374984741,
			-1.0759155750274658,
			0.44764548540115356,
			0.766624927520752,
			-0.4602801501750946,
			0.37702473998069763,
			0.562798261642456,
			0.3547264337539673,
			3.699439287185669,
			-1.2424918413162231,
			0.34446242451667786,
			0.7595141530036926,
			-0.5517441034317017,
			0.4853841960430145,
			0.5503576993942261,
			0.47778165340423584,
			3.5628180503845215,
			-1.3511277437210083,
			0.4291512668132782,
			0.5910519957542419,
			-0.6829737424850464,
			0.4949337840080261,
			0.6364588737487793,
			0.8038058876991272,
			3.5849833488464355,
			-1.009704828262329,
			-0.6648457050323486,
			-0.617908239364624,
			0.4196600317955017,
			0.29044729471206665,
			0.6599355638027191,
			0.6807506084442139,
			3.721604108810425,
			-0.9010685682296753,
			-0.5267494916915894,
			-0.7614368200302124,
			0.37775811553001404,
			0.28089770674705505,
			0.5738343894481659,
			0.8038058876991272,
			3.5849833488464355,
			-1.009704828262329,
			0.6648457050323486,
			0.617908239364624,
			-0.4196600317955017,
			0.29044729471206665,
			0.6599355638027191,
			0.6807506084442139,
			3.721604108810425,
			-0.9010685682296753,
			0.5267494916915894,
			0.7614368200302124,
			-0.37775811553001404,
			0.28089770674705505,
			0.5738343894481659,
			0.8706254959106445,
			3.348348379135132,
			-1.0562633275985718,
			-0.7456892728805542,
			-0.5013886094093323,
			0.4387951195240021,
			0.29999691247940063,
			0.7460367381572723,
			0.7734745144844055,
			3.417229413986206,
			-1.2529337406158447,
			-0.635242760181427,
			-0.491378515958786,
			0.5957823395729065,
			0.3886107802391052,
			0.7358631789684296,
			0.544601321220398,
			3.326183795928955,
			-1.3976863622665405,
			-0.4745628237724304,
			-0.45612964034080505,
			0.7527695298194885,
			0.5044834017753601,
			0.7225600481033325,
			0.8706254959106445,
			3.348348379135132,
			-1.0562633275985718,
			0.7456892728805542,
			0.5013886094093323,
			-0.4387951195240021,
			0.29999691247940063,
			0.7460367381572723,
			0.7734745144844055,
			3.417229413986206,
			-1.2529337406158447,
			0.635242760181427,
			0.491378515958786,
			-0.5957823395729065,
			0.38861075043678284,
			0.7358631789684296,
			0.544601321220398,
			3.326183795928955,
			-1.3976863622665405,
			0.4745628237724304,
			0.45612964034080505,
			-0.7527695298194885,
			0.5044834017753601,
			0.7225600481033325,
			0.4767645597457886,
			3.7993671894073486,
			-1.4997481107711792,
			-0.3742789924144745,
			-0.8532364964485168,
			0.3630787134170532,
			0.3931775987148285,
			0.6214362382888794,
			0.2873603105545044,
			3.7996811866760254,
			-1.6457797288894653,
			-0.2466200739145279,
			-0.8397473096847534,
			0.4836573302745819,
			0.4949337840080261,
			0.6364588737487793,
			0.21663153171539307,
			3.8733906745910645,
			-1.4582321643829346,
			-0.2220221608877182,
			-0.9351176619529724,
			0.2761009633541107,
			0.4853841960430145,
			0.5503576993942261,
			0.4472084045410156,
			3.8459646701812744,
			-1.3604971170425415,
			-0.3486739695072174,
			-0.9091463685035706,
			0.22766807675361633,
			0.37702473998069763,
			0.5627982318401337,
			0.4767645597457886,
			3.7993671894073486,
			-1.4997481107711792,
			0.3742789924144745,
			0.8532364964485168,
			-0.3630787134170532,
			0.3931775987148285,
			0.6214362382888794,
			0.4472084045410156,
			3.8459646701812744,
			-1.3604971170425415,
			0.3486739695072174,
			0.9091463685035706,
			-0.22766807675361633,
			0.37702473998069763,
			0.562798261642456,
			0.21663153171539307,
			3.8733906745910645,
			-1.4582321643829346,
			0.2220221608877182,
			0.9351176619529724,
			-0.2761009633541107,
			0.4853841960430145,
			0.5503576993942261,
			0.2873603105545044,
			3.7996811866760254,
			-1.6457797288894653,
			0.2466200739145279,
			0.8397473096847534,
			-0.4836573302745819,
			0.4949337840080261,
			0.6364588737487793,
			0.7038124799728394,
			3.6958773136138916,
			-1.447928786277771,
			-0.5537278652191162,
			-0.7678151726722717,
			0.32212287187576294,
			0.29044729471206665,
			0.6599355638027191,
			0.6330838203430176,
			3.7695870399475098,
			-1.2603813409805298,
			-0.44868311285972595,
			-0.8744773864746094,
			0.18420971930027008,
			0.28089770674705505,
			0.5738343894481659,
			0.7038124799728394,
			3.6958773136138916,
			-1.447928786277771,
			0.5537278652191162,
			0.7678151726722717,
			-0.32212287187576294,
			0.29044729471206665,
			0.6599355638027191,
			0.6330838203430176,
			3.7695870399475098,
			-1.2603813409805298,
			0.44868311285972595,
			0.8744773864746094,
			-0.18420971930027008,
			0.28089770674705505,
			0.5738343894481659,
			0.7317309379577637,
			3.502835273742676,
			-1.6047214269638062,
			-0.6140323877334595,
			-0.6735740303993225,
			0.4113284647464752,
			0.29999691247940063,
			0.7460367381572723,
			0.584857702255249,
			3.641465663909912,
			-1.7145946025848389,
			-0.4599139392375946,
			-0.7234412431716919,
			0.5148472785949707,
			0.3886107802391052,
			0.7358631789684296,
			0.31527864933013916,
			3.6066389083862305,
			-1.8025723695755005,
			-0.2560197710990906,
			-0.747825562953949,
			0.6124759912490845,
			0.5044834017753601,
			0.7225600481033325,
			0.7317309379577637,
			3.502835273742676,
			-1.6047214269638062,
			0.6140323877334595,
			0.6735740303993225,
			-0.4113284647464752,
			0.29999691247940063,
			0.7460367381572723,
			0.584857702255249,
			3.641465663909912,
			-1.7145946025848389,
			0.4599139392375946,
			0.7234412431716919,
			-0.5148472785949707,
			0.38861075043678284,
			0.7358631789684296,
			0.31527864933013916,
			3.6066389083862305,
			-1.8025723695755005,
			0.2560197710990906,
			0.747825562953949,
			-0.6124759912490845,
			0.5044834017753601,
			0.7225600481033325,
			1.4799021482467651,
			3.4832956790924072,
			-0.21252486109733582,
			-0.7599719166755676,
			-0.35474714636802673,
			0.5445722937583923,
			0.3931775987148285,
			0.6214362382888794,
			1.3738727569580078,
			3.4477412700653076,
			-0.3587721288204193,
			-0.6660054326057434,
			-0.299752801656723,
			0.6830347776412964,
			0.4949337840080261,
			0.6364588737487793,
			1.3193784952163696,
			3.590136766433716,
			-0.29728373885154724,
			-0.6409497261047363,
			-0.503311276435852,
			0.5794854760169983,
			0.4853841960430145,
			0.5503576993942261,
			1.4525182247161865,
			3.580345630645752,
			-0.15661278367042542,
			-0.7325357794761658,
			-0.4847865104675293,
			0.4778282940387726,
			0.37702473998069763,
			0.5627982318401337,
			1.4799021482467651,
			3.4832956790924072,
			-0.21252486109733582,
			0.7599719166755676,
			0.35474714636802673,
			-0.5445722937583923,
			0.3931775987148285,
			0.6214362382888794,
			1.4525182247161865,
			3.580345630645752,
			-0.15661278367042542,
			0.7325357794761658,
			0.4847865104675293,
			-0.4778282940387726,
			0.37702473998069763,
			0.562798261642456,
			1.3193784952163696,
			3.590136766433716,
			-0.29728373885154724,
			0.6409497261047363,
			0.503311276435852,
			-0.5794854760169983,
			0.4853841960430145,
			0.5503576993942261,
			1.3738727569580078,
			3.4477412700653076,
			-0.3587721288204193,
			0.6660054326057434,
			0.299752801656723,
			-0.6830347776412964,
			0.4949337840080261,
			0.6364588737487793,
			1.5936602354049683,
			3.407858371734619,
			-0.07162243127822876,
			-0.8752708435058594,
			-0.27451398968696594,
			0.3981139659881592,
			0.29044729471206665,
			0.6599355638027191,
			1.5391649007797241,
			3.55025315284729,
			-0.010133981704711914,
			-0.7979064583778381,
			-0.46241647005081177,
			0.3866084814071655,
			0.28089770674705505,
			0.5738343894481659,
			1.5936602354049683,
			3.407858371734619,
			-0.07162243127822876,
			0.8752708435058594,
			0.27451398968696594,
			-0.3981139659881592,
			0.29044729471206665,
			0.6599355638027191,
			1.5391649007797241,
			3.55025315284729,
			-0.010133981704711914,
			0.7979064583778381,
			0.46241647005081177,
			-0.3866084814071655,
			0.28089770674705505,
			0.5738343894481659,
			1.5760189294815063,
			3.2163844108581543,
			-0.08338606357574463,
			-0.9080782532691956,
			-0.1352275162935257,
			0.3963438868522644,
			0.29999691247940063,
			0.7460367381572723,
			1.5373836755752563,
			3.272181987762451,
			-0.24684348702430725,
			-0.8133792877197266,
			-0.14496292173862457,
			0.5633411407470703,
			0.3886107802391052,
			0.7358631789684296,
			1.356231927871704,
			3.256267547607422,
			-0.3705354332923889,
			-0.6628009676933289,
			-0.14957121014595032,
			0.7336649894714355,
			0.5044834017753601,
			0.7225600481033325,
			1.5760189294815063,
			3.2163844108581543,
			-0.08338606357574463,
			0.9080782532691956,
			0.1352275162935257,
			-0.3963438868522644,
			0.29999691247940063,
			0.7460367381572723,
			1.5373836755752563,
			3.272181987762451,
			-0.24684348702430725,
			0.8133792877197266,
			0.14496292173862457,
			-0.5633411407470703,
			0.38861075043678284,
			0.7358631789684296,
			1.356231927871704,
			3.256267547607422,
			-0.3705354332923889,
			0.6628009676933289,
			0.14957121014595032,
			-0.7336649894714355,
			0.5044834017753601,
			0.7225600481033325,
			1.6536883115768433,
			3.402512311935425,
			0.042575299739837646,
			-0.9030121564865112,
			-0.4197515845298767,
			0.09121982753276825,
			0.3931775987148285,
			0.6214362382888794,
			1.6842834949493408,
			3.256843328475952,
			-0.13681122660636902,
			-0.9319437146186829,
			-0.2944425940513611,
			0.21155430376529694,
			0.4949337840080261,
			0.6364588737487793,
			1.5695208311080933,
			3.4142208099365234,
			-0.21021249890327454,
			-0.8303475975990295,
			-0.49620044231414795,
			0.2534867525100708,
			0.4853841960430145,
			0.5503576993942261,
			1.5724480152130127,
			3.519752025604248,
			0.01147693395614624,
			-0.8293710350990295,
			-0.5446638464927673,
			0.12421033531427383,
			0.37702473998069763,
			0.5627982318401337,
			1.6536883115768433,
			3.402512311935425,
			0.042575299739837646,
			0.9030121564865112,
			0.4197515845298767,
			-0.09121982753276825,
			0.3931775987148285,
			0.6214362382888794,
			1.5724480152130127,
			3.519752025604248,
			0.01147693395614624,
			0.8293710350990295,
			0.5446638464927673,
			-0.12421033531427383,
			0.37702473998069763,
			0.562798261642456,
			1.5695208311080933,
			3.4142208099365234,
			-0.21021249890327454,
			0.8303475975990295,
			0.49620044231414795,
			-0.2534867525100708,
			0.4853841960430145,
			0.5503576993942261,
			1.6842834949493408,
			3.256843328475952,
			-0.13681122660636902,
			0.9319437146186829,
			0.2944425940513611,
			-0.21155430376529694,
			0.4949337840080261,
			0.6364588737487793,
			1.6437517404556274,
			3.4261796474456787,
			0.2896283268928528,
			-0.8928189873695374,
			-0.4365062415599823,
			-0.110721156001091,
			0.29044729471206665,
			0.6599355638027191,
			1.528988242149353,
			3.5835559368133545,
			0.21622681617736816,
			-0.8165532350540161,
			-0.5770134329795837,
			0.015198217704892159,
			0.28089770674705505,
			0.5738343894481659,
			1.6437517404556274,
			3.4261796474456787,
			0.2896283268928528,
			0.8928189873695374,
			0.4365062415599823,
			0.110721156001091,
			0.29044729471206665,
			0.6599355638027191,
			1.528988242149353,
			3.5835559368133545,
			0.21622681617736816,
			0.8165532350540161,
			0.5770134329795837,
			-0.015198217704892159,
			0.28089770674705505,
			0.5738343894481659,
			1.6529194116592407,
			3.2004475593566895,
			0.3815699815750122,
			-0.9244056344032288,
			-0.3266090750694275,
			-0.19678334891796112,
			0.29999691247940063,
			0.7460367381572723,
			1.7533501386642456,
			3.180708169937134,
			0.18222343921661377,
			-0.9681081771850586,
			-0.24909207224845886,
			-0.026398509740829468,
			0.3886107802391052,
			0.7358631789684296,
			1.693450689315796,
			3.031111001968384,
			-0.044869303703308105,
			-0.9735404253005981,
			-0.14566484093666077,
			0.17596971988677979,
			0.5044834017753601,
			0.7225600481033325,
			1.6529194116592407,
			3.2004475593566895,
			0.3815699815750122,
			0.9244056344032288,
			0.3266090750694275,
			0.19678334891796112,
			0.29999691247940063,
			0.7460367381572723,
			1.7533501386642456,
			3.180708169937134,
			0.18222343921661377,
			0.9681081771850586,
			0.24909207224845886,
			0.026398509740829468,
			0.38861075043678284,
			0.7358631789684296,
			1.693450689315796,
			3.031111001968384,
			-0.044869303703308105,
			0.9735404253005981,
			0.14566484093666077,
			-0.17596971988677979,
			0.5044834017753601,
			0.7225600481033325,
			1.442207932472229,
			3.554001808166504,
			0.050611138343811035,
			-0.025757621973752975,
			-0.9551377892494202,
			-0.2950224280357361,
			0.3931775987148285,
			0.6214362382888794,
			1.5284558534622192,
			3.4938952922821045,
			0.19343608617782593,
			-0.09128086268901825,
			-0.8907132148742676,
			-0.4452650547027588,
			0.4949337840080261,
			0.6364588737487793,
			1.636443018913269,
			3.5020787715911865,
			0.07789504528045654,
			-0.2153691202402115,
			-0.9416180849075317,
			-0.25873592495918274,
			0.4853841960430145,
			0.5503576993942261,
			1.5053766965866089,
			3.563392400741577,
			-0.04025989770889282,
			-0.1113620400428772,
			-0.9781182408332825,
			-0.17560350894927979,
			0.37702473998069763,
			0.5627982318401337,
			1.442207932472229,
			3.554001808166504,
			0.050611138343811035,
			0.025757621973752975,
			0.9551377892494202,
			0.2950224280357361,
			0.3931775987148285,
			0.6214362382888794,
			1.5053766965866089,
			3.563392400741577,
			-0.04025989770889282,
			0.1113620400428772,
			0.9781182408332825,
			0.17560350894927979,
			0.37702473998069763,
			0.562798261642456,
			1.636443018913269,
			3.5020787715911865,
			0.07789504528045654,
			0.2153691202402115,
			0.9416180849075317,
			0.25873592495918274,
			0.4853841960430145,
			0.5503576993942261,
			1.5284558534622192,
			3.4938952922821045,
			0.19343608617782593,
			0.09128086268901825,
			0.8907132148742676,
			0.4452650547027588,
			0.4949337840080261,
			0.6364588737487793,
			1.2756820917129517,
			3.568531036376953,
			-0.03752565383911133,
			0.15356913208961487,
			-0.9674977660179138,
			-0.20084230601787567,
			0.29044729471206665,
			0.6599355638027191,
			1.3836697340011597,
			3.576714277267456,
			-0.15306657552719116,
			-0.023468732833862305,
			-0.9942625164985657,
			-0.10409863293170929,
			0.28089770674705505,
			0.5738343894481659,
			1.2756820917129517,
			3.568531036376953,
			-0.03752565383911133,
			-0.15356913208961487,
			0.9674977660179138,
			0.20084230601787567,
			0.29044729471206665,
			0.6599355638027191,
			1.3836697340011597,
			3.576714277267456,
			-0.15306657552719116,
			0.023468732833862305,
			0.9942625164985657,
			0.10409863293170929,
			0.28089770674705505,
			0.5738343894481659,
			1.1552298069000244,
			3.466184616088867,
			0.0596962571144104,
			0.27454450726509094,
			-0.9245887398719788,
			-0.2640461325645447,
			0.29999691247940063,
			0.7460367381572723,
			1.274550437927246,
			3.5077362060546875,
			0.17415916919708252,
			0.1507614403963089,
			-0.8999603390693665,
			-0.40903958678245544,
			0.3886107802391052,
			0.7358631789684296,
			1.4080032110214233,
			3.3915483951568604,
			0.2906578779220581,
			-0.0025635547935962677,
			-0.8279976844787598,
			-0.5607165694236755,
			0.5044834017753601,
			0.7225600481033325,
			1.1552298069000244,
			3.466184616088867,
			0.0596962571144104,
			-0.27454450726509094,
			0.9245887398719788,
			0.2640461325645447,
			0.29999691247940063,
			0.7460367381572723,
			1.274550437927246,
			3.5077362060546875,
			0.17415916919708252,
			-0.1507614403963089,
			0.8999603390693665,
			0.40903958678245544,
			0.38861075043678284,
			0.7358631789684296,
			1.4080032110214233,
			3.3915483951568604,
			0.2906578779220581,
			0.0025635547935962677,
			0.8279976844787598,
			0.5607165694236755,
			0.5044834017753601,
			0.7225600481033325,
			-1.2609835863113403,
			4.43144416809082,
			0.6497327089309692,
			-0.24182866513729095,
			-0.9700613617897034,
			0.020874660462141037,
			0.3931775987148285,
			0.6214362382888794,
			-1.4420721530914307,
			4.389402866363525,
			1.0252577066421509,
			-0.13309122622013092,
			-0.9729605913162231,
			-0.18872645497322083,
			0.4949337840080261,
			0.6364588737487793,
			-1.1001960039138794,
			4.280154228210449,
			1.0571379661560059,
			-0.383007287979126,
			-0.905026376247406,
			-0.18491165339946747,
			0.4853841960430145,
			0.5503576993942261,
			-1.04409658908844,
			4.300769805908203,
			0.6347062587738037,
			-0.395245224237442,
			-0.9175695180892944,
			0.04223761707544327,
			0.37702473998069763,
			0.5627982318401337,
			-1.2609835863113403,
			4.43144416809082,
			0.6497327089309692,
			0.24182866513729095,
			0.9700613617897034,
			-0.020874660462141037,
			0.3931775987148285,
			0.6214362382888794,
			-1.04409658908844,
			4.300769805908203,
			0.6347062587738037,
			0.395245224237442,
			0.9175695180892944,
			-0.04223761707544327,
			0.37702473998069763,
			0.562798261642456,
			-1.1001960039138794,
			4.280154228210449,
			1.0571379661560059,
			0.383007287979126,
			0.905026376247406,
			0.18491165339946747,
			0.4853841960430145,
			0.5503576993942261,
			-1.4420721530914307,
			4.389402866363525,
			1.0252577066421509,
			0.13309122622013092,
			0.9729605913162231,
			0.18872645497322083,
			0.4949337840080261,
			0.6364588737487793,
			-1.385987401008606,
			4.345803260803223,
			0.2280818372964859,
			-0.18475905060768127,
			-0.938901960849762,
			0.29035308957099915,
			0.29044729471206665,
			0.6599355638027191,
			-1.0441111326217651,
			4.236555099487305,
			0.2599621117115021,
			-0.3898739516735077,
			-0.8919034600257874,
			0.22901089489459991,
			0.28089770674705505,
			0.5738343894481659,
			-1.385987401008606,
			4.345803260803223,
			0.2280818372964859,
			0.18475905060768127,
			0.938901960849762,
			-0.29035308957099915,
			0.29044729471206665,
			0.6599355638027191,
			-1.0441111326217651,
			4.236555099487305,
			0.2599621117115021,
			0.3898739516735077,
			0.8919034600257874,
			-0.22901089489459991,
			0.28089770674705505,
			0.5738343894481659,
			-1.8052350282669067,
			4.3026580810546875,
			0.19620157778263092,
			-0.04547257721424103,
			-0.9452803134918213,
			0.3230079114437103,
			0.29999691247940063,
			0.7460367381572723,
			-1.7399717569351196,
			4.469992637634277,
			0.5416561365127563,
			-0.009704886004328728,
			-0.9954222440719604,
			0.0950346365571022,
			0.3886107802391052,
			0.7358631789684296,
			-1.8613197803497314,
			4.346257209777832,
			0.9933773875236511,
			0.033753469586372375,
			-0.982238233089447,
			-0.18448439240455627,
			0.5044834017753601,
			0.7225600481033325,
			-1.8052350282669067,
			4.3026580810546875,
			0.19620157778263092,
			0.04547257721424103,
			0.9452803134918213,
			-0.3230079114437103,
			0.29999691247940063,
			0.7460367381572723,
			-1.7399717569351196,
			4.469992637634277,
			0.5416561365127563,
			0.009704886004328728,
			0.9954222440719604,
			-0.0950346365571022,
			0.38861075043678284,
			0.7358631789684296,
			-1.8613197803497314,
			4.346257209777832,
			0.9933773875236511,
			-0.033753469586372375,
			0.982238233089447,
			0.18448439240455627,
			0.5044834017753601,
			0.7225600481033325,
			-0.779165506362915,
			4.198056221008301,
			0.9196071624755859,
			-0.5931577682495117,
			-0.8046205043792725,
			-0.02618488110601902,
			0.3931775987148285,
			0.6214362382888794,
			-0.43657755851745605,
			3.8016350269317627,
			0.9263560175895691,
			-0.7646412253379822,
			-0.6430249810218811,
			-0.042359691113233566,
			0.4949337840080261,
			0.6364588737487793,
			-0.5582501888275146,
			3.8680572509765625,
			0.49762940406799316,
			-0.6814783215522766,
			-0.7053743004798889,
			0.19486068189144135,
			0.4853841960430145,
			0.5503576993942261,
			-0.9396240711212158,
			4.2102508544921875,
			0.6462605595588684,
			-0.52098149061203,
			-0.8458204865455627,
			0.11462752521038055,
			0.37702473998069763,
			0.5627982318401337,
			-0.779165506362915,
			4.198056221008301,
			0.9196071624755859,
			0.5931577682495117,
			0.8046205043792725,
			0.02618488110601902,
			0.3931775987148285,
			0.6214362382888794,
			-0.9396240711212158,
			4.2102508544921875,
			0.6462605595588684,
			0.52098149061203,
			0.8458204865455627,
			-0.11462752521038055,
			0.37702473998069763,
			0.562798261642456,
			-0.5582501888275146,
			3.8680572509765625,
			0.49762940406799316,
			0.6814783215522766,
			0.7053743004798889,
			-0.19486068189144135,
			0.4853841960430145,
			0.5503576993942261,
			-0.43657755851745605,
			3.8016350269317627,
			0.9263560175895691,
			0.7646412253379822,
			0.6430249810218811,
			0.042359691113233566,
			0.4949337840080261,
			0.6364588737487793,
			-1.2158253192901611,
			4.3472065925598145,
			1.237418293952942,
			-0.382396936416626,
			-0.9074373841285706,
			-0.17398601770401,
			0.29044729471206665,
			0.6599355638027191,
			-1.3374977111816406,
			4.413628578186035,
			0.8086918592453003,
			-0.3673512935638428,
			-0.9290444850921631,
			0.04358043149113655,
			0.28089770674705505,
			0.5738343894481659,
			-1.2158253192901611,
			4.3472065925598145,
			1.237418293952942,
			0.382396936416626,
			0.9074373841285706,
			0.17398601770401,
			0.29044729471206665,
			0.6599355638027191,
			-1.3374977111816406,
			4.413628578186035,
			0.8086918592453003,
			0.3673512935638428,
			0.9290444850921631,
			-0.04358043149113655,
			0.28089770674705505,
			0.5738343894481659,
			-1.206734299659729,
			4.103634357452393,
			1.7064037322998047,
			-0.3823053538799286,
			-0.86968594789505,
			-0.31211280822753906,
			0.29999691247940063,
			0.7460367381572723,
			-0.7618999481201172,
			4.0474724769592285,
			1.5165868997573853,
			-0.5882442593574524,
			-0.7630848288536072,
			-0.26761680841445923,
			0.3886107802391052,
			0.7358631789684296,
			-0.42748698592185974,
			3.558063507080078,
			1.3953417539596558,
			-0.791283905506134,
			-0.5795770287513733,
			-0.19473861157894135,
			0.5044834017753601,
			0.7225600481033325,
			-1.206734299659729,
			4.103634357452393,
			1.7064037322998047,
			0.3823053538799286,
			0.86968594789505,
			0.31211280822753906,
			0.29999691247940063,
			0.7460367381572723,
			-0.7618999481201172,
			4.0474724769592285,
			1.5165868997573853,
			0.5882442593574524,
			0.7630848288536072,
			0.26761680841445923,
			0.38861075043678284,
			0.7358631789684296,
			-0.42748698592185974,
			3.558063507080078,
			1.3953417539596558,
			0.791283905506134,
			0.5795770287513733,
			0.19473861157894135,
			0.5044834017753601,
			0.7225600481033325,
			0.40493044257164,
			3.5255672931671143,
			1.899562120437622,
			0.0791344940662384,
			-0.8406628370285034,
			-0.5356913805007935,
			0.3931775987148285,
			0.6214362382888794,
			0.8975107669830322,
			3.3740766048431396,
			1.994309425354004,
			-0.14069032669067383,
			-0.7857295274734497,
			-0.6023132801055908,
			0.4949337840080261,
			0.6364588737487793,
			0.8960785865783691,
			3.5902256965637207,
			1.598961353302002,
			-0.11249122768640518,
			-0.9176000356674194,
			-0.3811761736869812,
			0.4853841960430145,
			0.5503576993942261,
			0.3627927899360657,
			3.6053152084350586,
			1.5954591035842896,
			0.11496322602033615,
			-0.9122592806816101,
			-0.39307838678359985,
			0.37702473998069763,
			0.5627982318401337,
			0.40493044257164,
			3.5255672931671143,
			1.899562120437622,
			-0.0791344940662384,
			0.8406628370285034,
			0.5356913805007935,
			0.3931775987148285,
			0.6214362382888794,
			0.3627927899360657,
			3.6053152084350586,
			1.5954591035842896,
			-0.11496322602033615,
			0.9122592806816101,
			0.39307838678359985,
			0.37702473998069763,
			0.562798261642456,
			0.8960785865783691,
			3.5902256965637207,
			1.598961353302002,
			0.11249122768640518,
			0.9176000356674194,
			0.3811761736869812,
			0.4853841960430145,
			0.5503576993942261,
			0.8975107669830322,
			3.3740766048431396,
			1.994309425354004,
			0.14069032669067383,
			0.7857295274734497,
			0.6023132801055908,
			0.4949337840080261,
			0.6364588737487793,
			-0.09875266253948212,
			3.2867400646209717,
			1.956009864807129,
			0.3397625684738159,
			-0.7512131333351135,
			-0.5658437013626099,
			0.29044729471206665,
			0.6599355638027191,
			-0.1001846045255661,
			3.5028891563415527,
			1.560662031173706,
			0.29914242029190063,
			-0.8719748258590698,
			-0.3874935209751129,
			0.28089770674705505,
			0.5738343894481659,
			-0.09875266253948212,
			3.2867400646209717,
			1.956009864807129,
			-0.3397625684738159,
			0.7512131333351135,
			0.5658437013626099,
			0.29044729471206665,
			0.6599355638027191,
			-0.1001846045255661,
			3.5028891563415527,
			1.560662031173706,
			-0.29914242029190063,
			0.8719748258590698,
			0.3874935209751129,
			0.28089770674705505,
			0.5738343894481659,
			-0.0805969387292862,
			2.8697361946105957,
			2.280256748199463,
			0.3575548529624939,
			-0.65251624584198,
			-0.6680806875228882,
			0.29999691247940063,
			0.7460367381572723,
			0.33294597268104553,
			3.1159582138061523,
			2.3538715839385986,
			0.12887966632843018,
			-0.6843165159225464,
			-0.7176732420921326,
			0.3886107802391052,
			0.7358631789684296,
			0.9156655073165894,
			2.957073211669922,
			2.318556308746338,
			-0.15396587550640106,
			-0.6721091270446777,
			-0.7242347598075867,
			0.5044834017753601,
			0.7225600481033325,
			-0.0805969387292862,
			2.8697361946105957,
			2.280256748199463,
			-0.3575548529624939,
			0.65251624584198,
			0.6680806875228882,
			0.29999691247940063,
			0.7460367381572723,
			0.33294597268104553,
			3.1159582138061523,
			2.3538715839385986,
			-0.12887966632843018,
			0.6843165159225464,
			0.7176732420921326,
			0.38861075043678284,
			0.7358631789684296,
			0.9156655073165894,
			2.957073211669922,
			2.318556308746338,
			0.15396587550640106,
			0.6721091270446777,
			0.7242347598075867,
			0.5044834017753601,
			0.7225600481033325,
			0.5150507688522339,
			3.4997756481170654,
			1.5953289270401,
			-0.7598498463630676,
			-0.49732962250709534,
			-0.4186529219150543,
			0.3931775987148285,
			0.6214362382888794,
			0.5954593420028687,
			3.4950485229492188,
			1.287213921546936,
			-0.8455763459205627,
			-0.49552902579307556,
			-0.1985534280538559,
			0.4949337840080261,
			0.6364588737487793,
			0.4176330864429474,
			3.700272560119629,
			1.3226698637008667,
			-0.6802575588226318,
			-0.6850184798240662,
			-0.2606585919857025,
			0.4853841960430145,
			0.5503576993942261,
			0.3558400571346283,
			3.604045867919922,
			1.6260924339294434,
			-0.6453138589859009,
			-0.6021606922149658,
			-0.4700155556201935,
			0.37702473998069763,
			0.5627982318401337,
			0.5150507688522339,
			3.4997756481170654,
			1.5953289270401,
			0.7598498463630676,
			0.49732962250709534,
			0.4186529219150543,
			0.3931775987148285,
			0.6214362382888794,
			0.3558400571346283,
			3.604045867919922,
			1.6260924339294434,
			0.6453138589859009,
			0.6021606922149658,
			0.4700155556201935,
			0.37702473998069763,
			0.562798261642456,
			0.4176330864429474,
			3.700272560119629,
			1.3226698637008667,
			0.6802575588226318,
			0.6850184798240662,
			0.2606585919857025,
			0.4853841960430145,
			0.5503576993942261,
			0.5954593420028687,
			3.4950485229492188,
			1.287213921546936,
			0.8455763459205627,
			0.49552902579307556,
			0.1985534280538559,
			0.4949337840080261,
			0.6364588737487793,
			0.4387364983558655,
			3.2618820667266846,
			1.8267267942428589,
			-0.7071443796157837,
			-0.3239539861679077,
			-0.6284371614456177,
			0.29044729471206665,
			0.6599355638027191,
			0.2609104812145233,
			3.467106342315674,
			1.8621824979782104,
			-0.5909299254417419,
			-0.5097506642341614,
			-0.6252021789550781,
			0.28089770674705505,
			0.5738343894481659,
			0.4387364983558655,
			3.2618820667266846,
			1.8267267942428589,
			0.7071443796157837,
			0.3239539861679077,
			0.6284371614456177,
			0.29044729471206665,
			0.6599355638027191,
			0.2609104812145233,
			3.467106342315674,
			1.8621824979782104,
			0.5909299254417419,
			0.5097506642341614,
			0.6252021789550781,
			0.28089770674705505,
			0.5738343894481659,
			0.5378538370132446,
			2.970799684524536,
			1.7337679862976074,
			-0.764946460723877,
			-0.19370098412036896,
			-0.6142154932022095,
			0.29999691247940063,
			0.7460367381572723,
			0.6779406070709229,
			3.1646382808685303,
			1.559490442276001,
			-0.8657185435295105,
			-0.2763756215572357,
			-0.41727957129478455,
			0.3886107802391052,
			0.7358631789684296,
			0.6945765018463135,
			3.2039663791656494,
			1.194256067276001,
			-0.922574520111084,
			-0.35489973425865173,
			-0.1511887013912201,
			0.5044834017753601,
			0.7225600481033325,
			0.5378538370132446,
			2.970799684524536,
			1.7337679862976074,
			0.764946460723877,
			0.19370098412036896,
			0.6142154932022095,
			0.29999691247940063,
			0.7460367381572723,
			0.6779406070709229,
			3.1646382808685303,
			1.559490442276001,
			0.8657185435295105,
			0.2763756215572357,
			0.41727957129478455,
			0.38861075043678284,
			0.7358631789684296,
			0.6945765018463135,
			3.2039663791656494,
			1.194256067276001,
			0.922574520111084,
			0.35489973425865173,
			0.1511887013912201,
			0.5044834017753601,
			0.7225600481033325,
			0.643882155418396,
			3.7494282722473145,
			1.638985514640808,
			0.0946073830127716,
			-0.7191991806030273,
			-0.6883144378662109,
			0.3931775987148285,
			0.6214362382888794,
			0.7451008558273315,
			4.0480451583862305,
			1.156072974205017,
			0.04263435676693916,
			-0.861018717288971,
			-0.5067293047904968,
			0.4949337840080261,
			0.6364588737487793,
			0.2626766264438629,
			3.9332048892974854,
			1.1618279218673706,
			0.29044464230537415,
			-0.791955292224884,
			-0.5370342135429382,
			0.4853841960430145,
			0.5503576993942261,
			0.33852821588516235,
			3.580718994140625,
			1.6253188848495483,
			0.24341562390327454,
			-0.6563920974731445,
			-0.7140415906906128,
			0.37702473998069763,
			0.5627982318401337,
			0.643882155418396,
			3.7494282722473145,
			1.638985514640808,
			-0.0946073830127716,
			0.7191991806030273,
			0.6883144378662109,
			0.3931775987148285,
			0.6214362382888794,
			0.33852821588516235,
			3.580718994140625,
			1.6253188848495483,
			-0.24341562390327454,
			0.6563920974731445,
			0.7140415906906128,
			0.37702473998069763,
			0.562798261642456,
			0.2626766264438629,
			3.9332048892974854,
			1.1618279218673706,
			-0.29044464230537415,
			0.791955292224884,
			0.5370342135429382,
			0.4853841960430145,
			0.5503576993942261,
			0.7451008558273315,
			4.0480451583862305,
			1.156072974205017,
			-0.04263435676693916,
			0.861018717288971,
			0.5067293047904968,
			0.4949337840080261,
			0.6364588737487793,
			0.9384652376174927,
			3.299433469772339,
			1.9406988620758057,
			-0.023468732833862305,
			-0.5270546674728394,
			-0.8494827151298523,
			0.29044729471206665,
			0.6599355638027191,
			0.4560404121875763,
			3.18459415435791,
			1.94645357131958,
			0.19483016431331635,
			-0.5181127190589905,
			-0.8327890634536743,
			0.28089770674705505,
			0.5738343894481659,
			0.9384652376174927,
			3.299433469772339,
			1.9406988620758057,
			0.023468732833862305,
			0.5270546674728394,
			0.8494827151298523,
			0.29044729471206665,
			0.6599355638027191,
			0.4560404121875763,
			3.18459415435791,
			1.94645357131958,
			-0.19483016431331635,
			0.5181127190589905,
			0.8327890634536743,
			0.28089770674705505,
			0.5738343894481659,
			1.4944273233413696,
			3.259010076522827,
			1.7742494344711304,
			-0.1660206913948059,
			-0.5192114114761353,
			-0.8383434414863586,
			0.29999691247940063,
			0.7460367381572723,
			1.3202691078186035,
			3.7335314750671387,
			1.5962274074554443,
			-0.1499069184064865,
			-0.7048555016517639,
			-0.6932889819145203,
			0.3886107802391052,
			0.7358631789684296,
			1.3010621070861816,
			4.007622241973877,
			0.9896248579025269,
			-0.11960203945636749,
			-0.8750572204589844,
			-0.4689779281616211,
			0.5044834017753601,
			0.7225600481033325,
			1.4944273233413696,
			3.259010076522827,
			1.7742494344711304,
			0.1660206913948059,
			0.5192114114761353,
			0.8383434414863586,
			0.29999691247940063,
			0.7460367381572723,
			1.3202691078186035,
			3.7335314750671387,
			1.5962274074554443,
			0.1499069184064865,
			0.7048555016517639,
			0.6932889819145203,
			0.38861075043678284,
			0.7358631789684296,
			1.3010621070861816,
			4.007622241973877,
			0.9896248579025269,
			0.11960203945636749,
			0.8750572204589844,
			0.4689779281616211,
			0.5044834017753601,
			0.7225600481033325,
			-1.6552172899246216,
			3.75923490524292,
			-0.8111565113067627,
			0.05688650161027908,
			-0.9943845868110657,
			0.08902249485254288,
			0.7658095955848694,
			0.7271782159805298,
			-2.6442596912384033,
			3.497037410736084,
			-0.26546159386634827,
			0.24921414256095886,
			-0.9684133529663086,
			0.007690664380788803,
			0.962746798992157,
			0.7726150453090668,
			-1.9229457378387451,
			3.531834840774536,
			0.4221799969673157,
			0.06189153715968132,
			-0.9838252067565918,
			-0.16794335842132568,
			0.9630098342895508,
			0.6067671775817871,
			-1.0936589241027832,
			3.619900941848755,
			-0.41363972425460815,
			-0.08560442179441452,
			-0.9963072538375854,
			0.005218665115535259,
			0.7735013365745544,
			0.6072396039962769,
			-1.6552172899246216,
			3.75923490524292,
			-0.8111565113067627,
			-0.12015137076377869,
			0.9813531637191772,
			-0.1498764008283615,
			0.7658095955848694,
			0.7271782159805298,
			-1.0936589241027832,
			3.619900941848755,
			-0.41363972425460815,
			0.08560442179441452,
			0.9963072538375854,
			-0.005218665115535259,
			0.7735013365745544,
			0.6072396636009216,
			-1.9229457378387451,
			3.531834840774536,
			0.4221799969673157,
			-0.06189153715968132,
			0.9838252067565918,
			0.16794335842132568,
			0.9630098342895508,
			0.6067671775817871,
			-2.6442596912384033,
			3.497037410736084,
			-0.26546159386634827,
			-0.34693440794944763,
			0.9319437146186829,
			-0.10513626784086227,
			0.962746798992157,
			0.7726150453090668,
			-1.1231894493103027,
			3.4018993377685547,
			-1.8726496696472168,
			-0.049501024186611176,
			-0.9513229727745056,
			0.3041474521160126,
			0.5686948895454407,
			0.7735066115856171,
			-0.4018762707710266,
			3.436699390411377,
			-1.1850087642669678,
			-0.20459608733654022,
			-0.9674672484397888,
			0.14868617057800293,
			0.5689578056335449,
			0.6076587438583374,
			-1.1231894493103027,
			3.4018993377685547,
			-1.8726496696472168,
			-0.0475478395819664,
			0.9171422719955444,
			-0.395672470331192,
			0.5686948895454407,
			0.7735066115856171,
			-0.4018762707710266,
			3.436699390411377,
			-1.1850087642669678,
			0.20459608733654022,
			0.9674672484397888,
			-0.14868617057800293,
			0.5689578056335449,
			0.6076587438583374,
			-1.509461760520935,
			3.149933338165283,
			-2.2323200702667236,
			0.23435163497924805,
			-0.7939695119857788,
			0.5609607100486755,
			0.5685634613037109,
			0.8564305752515793,
			-2.0655694007873535,
			3.5843052864074707,
			-1.3264350891113281,
			0.3328653872013092,
			-0.862025797367096,
			0.3821527659893036,
			0.7722005248069763,
			0.8333467841148376,
			-3.030531406402588,
			3.2450695037841797,
			-0.6251316070556641,
			0.5327921509742737,
			-0.791924774646759,
			0.29819634556770325,
			0.9626153707504272,
			0.8555389940738678,
			-1.7624635696411133,
			2.660789966583252,
			-2.48103404045105,
			-0.2068239450454712,
			0.8234199285507202,
			-0.5283669829368591,
			0.5684320330619812,
			0.9393545314669609,
			-2.3902931213378906,
			3.1505322456359863,
			-1.768341302871704,
			-0.34519484639167786,
			0.8376415371894836,
			-0.42326119542121887,
			0.7785912156105042,
			0.9395153783261776,
			-3.24259090423584,
			2.774545192718506,
			-0.8415472507476807,
			-0.503158688545227,
			0.8195745944976807,
			-0.27399519085884094,
			0.9624839425086975,
			0.9384629353880882,
			-2.3902931213378906,
			3.1505322456359863,
			-1.768341302871704,
			0.47288429737091064,
			-0.6916409730911255,
			0.5458540320396423,
			0.7785913348197937,
			0.9395153932273388,
			-3.24259090423584,
			2.774545192718506,
			-0.8415472507476807,
			0.6255683898925781,
			-0.6664937138557434,
			0.4054383933544159,
			0.9624839425086975,
			0.9384629353880882,
			-1.7624635696411133,
			2.660789966583252,
			-2.48103404045105,
			0.33689382672309875,
			-0.6901455521583557,
			0.6404614448547363,
			0.5684320330619812,
			0.9393545314669609,
			-2.2464258670806885,
			4.155467510223389,
			0.054487936198711395,
			0.14688558876514435,
			-0.9845881462097168,
			-0.0946989357471466,
			0.7658095955848694,
			0.7271782159805298,
			-2.4396376609802246,
			3.8791205883026123,
			0.781486451625824,
			0.22019104659557343,
			-0.9328593015670776,
			-0.2850123643875122,
			0.962746798992157,
			0.7726150453090668,
			-1.7533137798309326,
			3.9363291263580322,
			0.7574895024299622,
			-0.035309914499521255,
			-0.9608447551727295,
			-0.27472761273384094,
			0.9630098342895508,
			0.6067671775817871,
			-1.7757385969161987,
			4.090590953826904,
			-0.043438512831926346,
			-0.011993774212896824,
			-0.9985961318016052,
			-0.051240578293800354,
			0.7735013365745544,
			0.6072396039962769,
			-2.2464258670806885,
			4.155467510223389,
			0.054487936198711395,
			-0.23392437398433685,
			0.9674672484397888,
			0.09619434177875519,
			0.7658095955848694,
			0.7271782159805298,
			-1.7757385969161987,
			4.090590953826904,
			-0.043438512831926346,
			0.011993774212896824,
			0.9985961318016052,
			0.051240578293800354,
			0.7735013365745544,
			0.6072396636009216,
			-1.7533137798309326,
			3.9363291263580322,
			0.7574895024299622,
			0.035309914499521255,
			0.9608447551727295,
			0.27472761273384094,
			0.9630098342895508,
			0.6067671775817871,
			-2.4396376609802246,
			3.8791205883026123,
			0.781486451625824,
			-0.3564561903476715,
			0.8903775215148926,
			0.28305917978286743,
			0.962746798992157,
			0.7726150453090668,
			-2.509958505630493,
			3.988595485687256,
			-0.7436322569847107,
			0.22641682624816895,
			-0.964629054069519,
			0.1349223256111145,
			0.5686948895454407,
			0.7735066115856171,
			-1.8236353397369385,
			4.04580545425415,
			-0.7676289081573486,
			0.007782219909131527,
			-0.9906308054924011,
			0.13614307343959808,
			0.5689578056335449,
			0.6076587438583374,
			-2.509958505630493,
			3.988595485687256,
			-0.7436322569847107,
			-0.3580431640148163,
			0.9241614937782288,
			-0.13296914100646973,
			0.5686948895454407,
			0.7735066115856171,
			-1.8236353397369385,
			4.04580545425415,
			-0.7676289081573486,
			-0.007782219909131527,
			0.9906308054924011,
			-0.13614307343959808,
			0.5689578056335449,
			0.6076587438583374,
			-2.866194248199463,
			3.7976667881011963,
			-0.7454468011856079,
			0.6010620594024658,
			-0.7888119220733643,
			0.12839137017726898,
			0.5685634613037109,
			0.8564305752515793,
			-2.693997621536255,
			4.020780563354492,
			-0.0036288388073444366,
			0.5433210134506226,
			-0.8362987041473389,
			-0.07336649298667908,
			0.7722005248069763,
			0.8333467841148376,
			-2.795872688293457,
			3.6881909370422363,
			0.7796714901924133,
			0.618091344833374,
			-0.7397992014884949,
			-0.26578569412231445,
			0.9626153707504272,
			0.8555389940738678,
			-3.0962982177734375,
			3.4508113861083984,
			-0.7789722681045532,
			-0.5598010420799255,
			0.8195745944976807,
			-0.12207403779029846,
			0.5684320330619812,
			0.9393545314669609,
			-3.056284189224243,
			3.7128400802612305,
			-0.08968482166528702,
			-0.5804010033607483,
			0.8127079010009766,
			0.05090487375855446,
			0.7785912156105042,
			0.9395153783261776,
			-2.990875720977783,
			3.3562257289886475,
			0.7429050207138062,
			-0.5813165903091431,
			0.7694021463394165,
			0.26462599635124207,
			0.9624839425086975,
			0.9384629353880882,
			-3.056284189224243,
			3.7128400802612305,
			-0.08968482166528702,
			0.7507247924804688,
			-0.6593524217605591,
			-0.040162358433008194,
			0.7785913348197937,
			0.9395153932273388,
			-2.990875720977783,
			3.3562257289886475,
			0.7429050207138062,
			0.7540818452835083,
			-0.6100649833679199,
			-0.24317148327827454,
			0.9624839425086975,
			0.9384629353880882,
			-3.0962982177734375,
			3.4508113861083984,
			-0.7789722681045532,
			0.7247535586357117,
			-0.6780297160148621,
			0.12237922102212906,
			0.5684320330619812,
			0.9393545314669609,
			0.16948653757572174,
			3.833122968673706,
			-0.2394685447216034,
			-0.40000611543655396,
			-0.8576311469078064,
			0.3231604993343353,
			0.7658095955848694,
			0.7271782159805298,
			0.26450788974761963,
			3.8841469287872314,
			0.5546302795410156,
			-0.41795098781585693,
			-0.9007537961006165,
			0.11798455566167831,
			0.962746798992157,
			0.7726150453090668,
			0.779058575630188,
			3.4970765113830566,
			0.3090631365776062,
			-0.6119876503944397,
			-0.7614368200302124,
			0.2135990411043167,
			0.9630098342895508,
			0.6067671775817871,
			0.4329100251197815,
			3.472752332687378,
			-0.42943182587623596,
			-0.5005035400390625,
			-0.7612231969833374,
			0.4123050570487976,
			0.7735013365745544,
			0.6072396039962769,
			0.16948653757572174,
			3.833122968673706,
			-0.2394685447216034,
			0.32938626408576965,
			0.8988921642303467,
			-0.28885769844055176,
			0.7658095955848694,
			0.7271782159805298,
			0.4329100251197815,
			3.472752332687378,
			-0.42943182587623596,
			0.5005035400390625,
			0.7612231969833374,
			-0.4123050570487976,
			0.7735013365745544,
			0.6072396636009216,
			0.779058575630188,
			3.4970765113830566,
			0.3090631365776062,
			0.6119876503944397,
			0.7614368200302124,
			-0.2135990411043167,
			0.9630098342895508,
			0.6067671775817871,
			0.26450788974761963,
			3.8841469287872314,
			0.5546302795410156,
			0.29792168736457825,
			0.9526352882385254,
			-0.060792870819568634,
			0.962746798992157,
			0.7726150453090668,
			-0.5007401704788208,
			3.7149620056152344,
			-0.7601659297943115,
			-0.21756646037101746,
			-0.8472243547439575,
			0.4846034049987793,
			0.5686948895454407,
			0.7735066115856171,
			0.013810813426971436,
			3.327893018722534,
			-1.0057333707809448,
			-0.3883480429649353,
			-0.731070876121521,
			0.5609301924705505,
			0.5689578056335449,
			0.6076587438583374,
			-0.5007401704788208,
			3.7149620056152344,
			-0.7601659297943115,
			0.10376293212175369,
			0.8985564708709717,
			-0.4264046251773834,
			0.5686948895454407,
			0.7735066115856171,
			0.013810813426971436,
			3.327893018722534,
			-1.0057333707809448,
			0.3883480429649353,
			0.731070876121521,
			-0.5609301924705505,
			0.5689578056335449,
			0.6076587438583374,
			-0.8502246737480164,
			3.7905962467193604,
			-0.5717489719390869,
			0.1340678185224533,
			-0.9473555684089661,
			0.29065829515457153,
			0.5685634613037109,
			0.8564305752515793,
			-0.248521089553833,
			3.9972381591796875,
			-0.09743136167526245,
			-0.031373027712106705,
			-0.9867854714393616,
			0.158818319439888,
			0.7722005248069763,
			0.8333467841148376,
			-0.08497685194015503,
			3.959779977798462,
			0.7430469393730164,
			-0.02841273322701454,
			-0.9972228407859802,
			-0.06878872215747833,
			0.9626153707504272,
			0.8555389940738678,
			-1.1965200901031494,
			3.6633365154266357,
			-0.3761346936225891,
			-0.08648945391178131,
			0.9463790059089661,
			-0.3112277686595917,
			0.5684320330619812,
			0.9393545314669609,
			-0.6992847323417664,
			3.971372604370117,
			0.07469555735588074,
			-0.017914365977048874,
			0.9875179529190063,
			-0.15628528594970703,
			0.7785912156105042,
			0.9395153783261776,
			-0.4003826975822449,
			3.8214237689971924,
			0.9189887642860413,
			0.06842249631881714,
			0.9966734647750854,
			0.04370250552892685,
			0.9624839425086975,
			0.9384629353880882,
			-0.6992847323417664,
			3.971372604370117,
			0.07469555735588074,
			0.21893978118896484,
			-0.9746086001396179,
			0.046418651938438416,
			0.7785913348197937,
			0.9395153932273388,
			-0.4003826975822449,
			3.8214237689971924,
			0.9189887642860413,
			0.1425214409828186,
			-0.9786370396614075,
			-0.14798425137996674,
			0.9624839425086975,
			0.9384629353880882,
			-1.1965200901031494,
			3.6633365154266357,
			-0.3761346936225891,
			0.27283546328544617,
			-0.9411298036575317,
			0.1994689702987671,
			0.5684320330619812,
			0.9393545314669609,
			-0.05212827026844025,
			4.427286624908447,
			1.0316029787063599,
			-0.21066926419734955,
			-0.9505295157432556,
			0.22815637290477753,
			0.7658095955848694,
			0.7271782159805298,
			0.02220594882965088,
			4.414517402648926,
			1.5130865573883057,
			-0.2299874871969223,
			-0.9729605913162231,
			0.0198370311409235,
			0.962746798992157,
			0.7726150453090668,
			0.36695051193237305,
			4.2638654708862305,
			1.3284685611724854,
			-0.4423352777957916,
			-0.886379599571228,
			0.13647878170013428,
			0.9630098342895508,
			0.6067671775817871,
			0.14147967100143433,
			4.258494853973389,
			0.886470377445221,
			-0.3234046399593353,
			-0.886532187461853,
			0.33082064986228943,
			0.7735013365745544,
			0.6072396039962769,
			-0.05212827026844025,
			4.427286624908447,
			1.0316029787063599,
			0.1351664811372757,
			0.9729300737380981,
			-0.18732261657714844,
			0.7658095955848694,
			0.7271782159805298,
			0.14147967100143433,
			4.258494853973389,
			0.886470377445221,
			0.3234046399593353,
			0.886532187461853,
			-0.33082064986228943,
			0.7735013365745544,
			0.6072396636009216,
			0.36695051193237305,
			4.2638654708862305,
			1.3284685611724854,
			0.4423352777957916,
			0.886379599571228,
			-0.13647878170013428,
			0.9630098342895508,
			0.6067671775817871,
			0.02220594882965088,
			4.414517402648926,
			1.5130865573883057,
			0.10516678541898727,
			0.9933775067329407,
			0.04623554274439812,
			0.962746798992157,
			0.7726150453090668,
			-0.45322999358177185,
			4.312527179718018,
			0.7193341255187988,
			-0.025971252471208572,
			-0.922574520111084,
			0.38486891984939575,
			0.5686948895454407,
			0.7735066115856171,
			-0.10848528146743774,
			4.161875247955322,
			0.5347158908843994,
			-0.21201208233833313,
			-0.8518021106719971,
			0.47901850938796997,
			0.5689578056335449,
			0.6076587438583374,
			-0.45322999358177185,
			4.312527179718018,
			0.7193341255187988,
			-0.09256263822317123,
			0.9435407519340515,
			-0.3179723620414734,
			0.5686948895454407,
			0.7735066115856171,
			-0.10848528146743774,
			4.161875247955322,
			0.5347158908843994,
			0.21201208233833313,
			0.8518021106719971,
			-0.47901850938796997,
			0.5689578056335449,
			0.6076587438583374,
			-0.6647635698318481,
			4.302465915679932,
			0.8441072106361389,
			0.32844018936157227,
			-0.9288613796234131,
			0.17120884358882904,
			0.5685634613037109,
			0.8564305752515793,
			-0.3162648379802704,
			4.464578151702881,
			1.1359299421310425,
			0.1674245446920395,
			-0.9850459098815918,
			0.0399487279355526,
			0.7722005248069763,
			0.8333467841148376,
			-0.18932771682739258,
			4.404455661773682,
			1.637859582901001,
			0.16116824746131897,
			-0.9689931869506836,
			-0.18726158142089844,
			0.9626153707504272,
			0.8555389940738678,
			-0.8503751754760742,
			4.172134876251221,
			0.9583597183227539,
			-0.28260138630867004,
			0.939603865146637,
			-0.19299905002117157,
			0.5684320330619812,
			0.9393545314669609,
			-0.5767337083816528,
			4.383365631103516,
			1.2450647354125977,
			-0.21576586365699768,
			0.9757683277130127,
			-0.036072880029678345,
			0.7785912156105042,
			0.9395153783261776,
			-0.355815052986145,
			4.272608280181885,
			1.738939642906189,
			-0.12308114767074585,
			0.9791863560676575,
			0.16125980019569397,
			0.9624839425086975,
			0.9384629353880882,
			-0.5767337083816528,
			4.383365631103516,
			1.2450647354125977,
			0.4048585593700409,
			-0.9111300706863403,
			-0.07660146057605743,
			0.7785913348197937,
			0.9395153932273388,
			-0.355815052986145,
			4.272608280181885,
			1.738939642906189,
			0.32123783230781555,
			-0.9082308411598206,
			-0.26807457208633423,
			0.9624839425086975,
			0.9384629353880882,
			-0.8503751754760742,
			4.172134876251221,
			0.9583597183227539,
			0.4587542414665222,
			-0.8851283192634583,
			0.07785271853208542,
			0.5684320330619812,
			0.9393545314669609,
			0.1205521747469902,
			4.4397664070129395,
			0.7562072277069092,
			0.06854457408189774,
			-0.8474990129470825,
			-0.5262916684150696,
			0.7658095955848694,
			0.7271782159805298,
			-0.23968705534934998,
			4.414211750030518,
			0.5846790075302124,
			0.2560808062553406,
			-0.8645283579826355,
			-0.43241676688194275,
			0.962746798992157,
			0.7726150453090668,
			-0.2436177134513855,
			4.2131876945495605,
			0.8635546565055847,
			0.25754570960998535,
			-0.7195043563842773,
			-0.6449171304702759,
			0.9630098342895508,
			0.6067671775817871,
			0.15744595229625702,
			4.260585784912109,
			0.9146679639816284,
			0.03250221163034439,
			-0.7530442476272583,
			-0.6571245193481445,
			0.7735013365745544,
			0.6072396039962769,
			0.1205521747469902,
			4.4397664070129395,
			0.7562072277069092,
			-0.06619464606046677,
			0.8910489082336426,
			0.44901883602142334,
			0.7658095955848694,
			0.7271782159805298,
			0.15744595229625702,
			4.260585784912109,
			0.9146679639816284,
			-0.03250221163034439,
			0.7530442476272583,
			0.6571245193481445,
			0.7735013365745544,
			0.6072396636009216,
			-0.2436177134513855,
			4.2131876945495605,
			0.8635546565055847,
			-0.25754570960998535,
			0.7195043563842773,
			0.6449171304702759,
			0.9630098342895508,
			0.6067671775817871,
			-0.23968705534934998,
			4.414211750030518,
			0.5846790075302124,
			-0.24842067062854767,
			0.9205603003501892,
			0.3013702929019928,
			0.962746798992157,
			0.7726150453090668,
			0.5229043364524841,
			4.443580627441406,
			0.6117760539054871,
			-0.16418957710266113,
			-0.8734092116355896,
			-0.45841851830482483,
			0.5686948895454407,
			0.7735066115856171,
			0.5189736485481262,
			4.242556095123291,
			0.8906518220901489,
			-0.15540024638175964,
			-0.7512741684913635,
			-0.6414074897766113,
			0.5689578056335449,
			0.6076587438583374,
			0.5229043364524841,
			4.443580627441406,
			0.6117760539054871,
			0.16779077053070068,
			0.9281899333000183,
			0.3320719003677368,
			0.5686948895454407,
			0.7735066115856171,
			0.5189736485481262,
			4.242556095123291,
			0.8906518220901489,
			0.15540024638175964,
			0.7512741684913635,
			0.6414074897766113,
			0.5689578056335449,
			0.6076587438583374,
			0.5305044054985046,
			4.486496925354004,
			0.41489988565444946,
			-0.17227698862552643,
			-0.983245313167572,
			-0.05941953882575035,
			0.5685634613037109,
			0.8564305752515793,
			0.15893155336380005,
			4.532271862030029,
			0.5436409711837769,
			0.03106784261763096,
			-0.9910885691642761,
			-0.12930692732334137,
			0.7722005248069763,
			0.8333467841148376,
			-0.2320866584777832,
			4.457128047943115,
			0.3878026604652405,
			0.221503347158432,
			-0.9751273989677429,
			-0.005188146606087685,
			0.9626153707504272,
			0.8555389940738678,
			0.5493844747543335,
			4.428772926330566,
			0.21561574935913086,
			0.16455580294132233,
			0.9801324605941772,
			0.1105990782380104,
			0.5684320330619812,
			0.9393545314669609,
			0.2075233906507492,
			4.530879020690918,
			0.3075258135795593,
			-0.007293923757970333,
			0.9962157011032104,
			0.08636738359928131,
			0.7785912156105042,
			0.9395153783261776,
			-0.21228951215744019,
			4.39361047744751,
			0.20668625831604004,
			-0.221533864736557,
			0.9737235903739929,
			0.05240027979016304,
			0.9624839425086975,
			0.9384629353880882,
			0.2075233906507492,
			4.530879020690918,
			0.3075258135795593,
			-0.008606219664216042,
			-0.9897457957267761,
			0.1424298882484436,
			0.7785913348197937,
			0.9395153932273388,
			-0.21228951215744019,
			4.39361047744751,
			0.20668625831604004,
			0.19489119946956635,
			-0.9638050198554993,
			0.1818903088569641,
			0.9624839425086975,
			0.9384629353880882,
			0.5493844747543335,
			4.428772926330566,
			0.21561574935913086,
			-0.17004913091659546,
			-0.9796136617660522,
			0.10663167387247086,
			0.5684320330619812,
			0.9393545314669609,
			0.35860320925712585,
			4.280272960662842,
			0.8504104018211365,
			-0.3161107301712036,
			-0.9484847784042358,
			-0.02053895592689514,
			0.7658095955848694,
			0.7271782159805298,
			0.4093884825706482,
			4.167437553405762,
			0.3903077244758606,
			-0.3752555847167969,
			-0.9110690355300903,
			0.17062897980213165,
			0.962746798992157,
			0.7726150453090668,
			0.08608512580394745,
			4.245654106140137,
			0.44476011395454407,
			-0.08154545724391937,
			-0.9869075417518616,
			0.13901181519031525,
			0.9630098342895508,
			0.6067671775817871,
			0.13335910439491272,
			4.265903472900391,
			0.9273781776428223,
			-0.13742484152317047,
			-0.9859614968299866,
			-0.0946379005908966,
			0.7735013365745544,
			0.6072396039962769,
			0.35860320925712585,
			4.280272960662842,
			0.8504104018211365,
			0.4043397307395935,
			0.9145481586456299,
			0.0098574785515666,
			0.7658095955848694,
			0.7271782159805298,
			0.13335910439491272,
			4.265903472900391,
			0.9273781776428223,
			0.13742484152317047,
			0.9859614968299866,
			0.0946379005908966,
			0.7735013365745544,
			0.6072396636009216,
			0.08608512580394745,
			4.245654106140137,
			0.44476011395454407,
			0.08154545724391937,
			0.9869075417518616,
			-0.13901181519031525,
			0.9630098342895508,
			0.6067671775817871,
			0.4093884825706482,
			4.167437553405762,
			0.3903077244758606,
			0.5087435245513916,
			0.8416394591331482,
			-0.18097476661205292,
			0.962746798992157,
			0.7726150453090668,
			0.5014563798904419,
			4.096101760864258,
			1.2931206226348877,
			-0.4111148416996002,
			-0.8801538348197937,
			-0.2372814118862152,
			0.5686948895454407,
			0.7735066115856171,
			0.178152397274971,
			4.174317836761475,
			1.347572922706604,
			-0.17392498254776,
			-0.9483627080917358,
			-0.26523637771606445,
			0.5689578056335449,
			0.6076587438583374,
			0.5014563798904419,
			4.096101760864258,
			1.2931206226348877,
			0.5352030992507935,
			0.8164616823196411,
			0.21662038564682007,
			0.5686948895454407,
			0.7735066115856171,
			0.178152397274971,
			4.174317836761475,
			1.347572922706604,
			0.17392498254776,
			0.9483627080917358,
			0.26523637771606445,
			0.5689578056335449,
			0.6076587438583374,
			0.6600098609924316,
			3.959768772125244,
			1.2603552341461182,
			-0.765221118927002,
			-0.6227912306785583,
			-0.16293832659721375,
			0.5685634613037109,
			0.8564305752515793,
			0.5660645961761475,
			4.1658616065979,
			0.8505285382270813,
			-0.7073885202407837,
			-0.7067781686782837,
			0.005615405738353729,
			0.7722005248069763,
			0.8333467841148376,
			0.5679421424865723,
			4.031104564666748,
			0.3575427532196045,
			-0.7544785737991333,
			-0.6269112229347229,
			0.19418928027153015,
			0.9626153707504272,
			0.8555389940738678,
			0.7500185966491699,
			3.737905502319336,
			1.2403491735458374,
			0.7404705882072449,
			0.65190589427948,
			0.16345714032649994,
			0.5684320330619812,
			0.9393545314669609,
			0.7233017683029175,
			3.95330548286438,
			0.8576714396476746,
			0.7470015287399292,
			0.6647541522979736,
			0.0050355540588498116,
			0.7785912156105042,
			0.9395153783261776,
			0.6422072649002075,
			3.820082426071167,
			0.34246397018432617,
			0.7293313145637512,
			0.6576128602027893,
			-0.18857386708259583,
			0.9624839425086975,
			0.9384629353880882,
			0.7233017683029175,
			3.95330548286438,
			0.8576714396476746,
			-0.8729209303855896,
			-0.48753318190574646,
			0.016113772988319397,
			0.7785913348197937,
			0.9395153932273388,
			0.6422072649002075,
			3.820082426071167,
			0.34246397018432617,
			-0.8594012260437012,
			-0.47331157326698303,
			0.19333475828170776,
			0.9624839425086975,
			0.9384629353880882,
			0.7500185966491699,
			3.737905502319336,
			1.2403491735458374,
			-0.8635822534561157,
			-0.48768576979637146,
			-0.1279030740261078,
			0.5684320330619812,
			0.9393545314669609,
			1.2810951471328735,
			3.5827231407165527,
			0.3420369625091553,
			-0.16010010242462158,
			-0.9663686156272888,
			-0.20114749670028687,
			0.7658095955848694,
			0.7271782159805298,
			1.6331459283828735,
			3.4698877334594727,
			0.041481077671051025,
			-0.34754478931427,
			-0.9291055202484131,
			-0.1262855976819992,
			0.962746798992157,
			0.7726150453090668,
			1.3602337837219238,
			3.5481042861938477,
			-0.14020299911499023,
			-0.03503524884581566,
			-0.9971923232078552,
			0.06582842767238617,
			0.9630098342895508,
			0.6067671775817871,
			1.0783395767211914,
			3.500640392303467,
			0.21195408701896667,
			0.051942504942417145,
			-0.9963988065719604,
			-0.06692709028720856,
			0.7735013365745544,
			0.6072396039962769,
			1.2810951471328735,
			3.5827231407165527,
			0.3420369625091553,
			0.23371075093746185,
			0.9378948211669922,
			0.2563554644584656,
			0.7658095955848694,
			0.7271782159805298,
			1.0783395767211914,
			3.500640392303467,
			0.21195408701896667,
			-0.051942504942417145,
			0.9963988065719604,
			0.06692709028720856,
			0.7735013365745544,
			0.6072396636009216,
			1.3602337837219238,
			3.5481042861938477,
			-0.14020299911499023,
			0.03503524884581566,
			0.9971923232078552,
			-0.06582842767238617,
			0.9630098342895508,
			0.6067671775817871,
			1.6331459283828735,
			3.4698877334594727,
			0.041481077671051025,
			0.4545426666736603,
			0.8649556040763855,
			0.21256141364574432,
			0.962746798992157,
			0.7726150453090668,
			1.0820796489715576,
			3.3985519409179688,
			0.7625035047531128,
			-0.10827967524528503,
			-0.9074984192848206,
			-0.4058046340942383,
			0.5686948895454407,
			0.7735066115856171,
			0.8091670870780945,
			3.4767680168151855,
			0.5808190107345581,
			0.1269875168800354,
			-0.9750968813896179,
			-0.1816766858100891,
			0.5689578056335449,
			0.6076587438583374,
			1.0820796489715576,
			3.3985519409179688,
			0.7625035047531128,
			0.21601000428199768,
			0.8501846194267273,
			0.48008668422698975,
			0.5686948895454407,
			0.7735066115856171,
			0.8091670870780945,
			3.4767680168151855,
			0.5808190107345581,
			-0.1269875168800354,
			0.9750968813896179,
			0.1816766858100891,
			0.5689578056335449,
			0.6076587438583374,
			1.2200703620910645,
			3.262218952178955,
			0.8471871018409729,
			-0.4461195766925812,
			-0.6227912306785583,
			-0.6426892876625061,
			0.5685634613037109,
			0.8564305752515793,
			1.4322149753570557,
			3.4683117866516113,
			0.48417431116104126,
			-0.5193945169448853,
			-0.7067781686782837,
			-0.48023927211761475,
			0.7722005248069763,
			0.8333467841148376,
			1.7711366415023804,
			3.333554744720459,
			0.1261650025844574,
			-0.6828516721725464,
			-0.6269112229347229,
			-0.3750419616699219,
			0.9626153707504272,
			0.8555389940738678,
			1.2993683815002441,
			3.040355682373047,
			0.8942364454269409,
			0.4277169108390808,
			0.65190589427948,
			0.6261177659034729,
			0.5684320330619812,
			0.9393545314669609,
			1.541920781135559,
			3.255755662918091,
			0.5970423221588135,
			0.5409711003303528,
			0.6647541522979736,
			0.5151829719543457,
			0.7785912156105042,
			0.9395153783261776,
			1.835586667060852,
			3.122532606124878,
			0.1660255491733551,
			0.6606646776199341,
			0.6576128602027893,
			0.36194953322410583,
			0.9624839425086975,
			0.9384629353880882,
			1.541920781135559,
			3.255755662918091,
			0.5970423221588135,
			-0.6472365260124207,
			-0.48753318190574646,
			-0.5859553813934326,
			0.7785913348197937,
			0.9395153932273388,
			1.835586667060852,
			3.122532606124878,
			0.1660255491733551,
			-0.7587206363677979,
			-0.47331157326698303,
			-0.44752341508865356,
			0.9624839425086975,
			0.9384629353880882,
			1.2993683815002441,
			3.040355682373047,
			0.8942364454269409,
			-0.5417950749397278,
			-0.48768576979637146,
			-0.6844996213912964,
			0.5684320330619812,
			0.9393545314669609,
			0.9654161334037781,
			3.6377623081207275,
			0.2777485251426697,
			0.32938626408576965,
			0.8988921642303467,
			-0.28885769844055176,
			0.7658095955848694,
			0.7271782159805298,
			1.0701305866241455,
			3.4945101737976074,
			0.20223551988601685,
			0.5005035400390625,
			0.7612231969833374,
			-0.4123050570487976,
			0.7735013365745544,
			0.6072396636009216,
			1.2077295780181885,
			3.5041792392730713,
			0.4957975149154663,
			0.6119876503944397,
			0.7614368200302124,
			-0.2135990411043167,
			0.9630098342895508,
			0.6067671775817871,
			1.0031883716583252,
			3.6580450534820557,
			0.593413770198822,
			0.29792168736457825,
			0.9526352882385254,
			-0.060792870819568634,
			0.962746798992157,
			0.7726150453090668,
			0.6989917159080505,
			3.590791702270508,
			0.07076415419578552,
			0.10376293212175369,
			0.8985564708709717,
			-0.4264046251773834,
			0.5686948895454407,
			0.7735066115856171,
			0.9035329222679138,
			3.4369266033172607,
			-0.026852309703826904,
			0.3883480429649353,
			0.731070876121521,
			-0.5609301924705505,
			0.5689578056335449,
			0.6076587438583374,
			0.42240971326828003,
			3.570269823074341,
			0.2234218716621399,
			-0.08648945391178131,
			0.9463790059089661,
			-0.3112277686595917,
			0.5684320330619812,
			0.9393545314669609,
			0.6200675368309021,
			3.692718505859375,
			0.4026331305503845,
			-0.017914365977048874,
			0.9875179529190063,
			-0.15628528594970703,
			0.7785912156105042,
			0.9395153783261776,
			0.738885223865509,
			3.6331117153167725,
			0.7382513284683228,
			0.06842249631881714,
			0.9966734647750854,
			0.04370250552892685,
			0.9624839425086975,
			0.9384629353880882,
			-0.5197031497955322,
			3.8954057693481445,
			-1.2873553037643433,
			0.36844995617866516,
			-0.9201635718345642,
			0.13232825696468353,
			0.7658095955848694,
			0.7271782159805298,
			-0.9730956554412842,
			3.5558762550354004,
			-1.4247565269470215,
			0.5377666354179382,
			-0.8179571032524109,
			0.20422986149787903,
			0.962746798992157,
			0.7726150453090668,
			-0.9607597589492798,
			3.5956859588623047,
			-0.9252867698669434,
			0.5320291519165039,
			-0.8451490998268127,
			-0.05151524394750595,
			0.9630098342895508,
			0.6067671775817871,
			-0.43317946791648865,
			3.8666024208068848,
			-0.9465081095695496,
			0.32837915420532227,
			-0.9441511034965515,
			-0.02624591812491417,
			0.7735013365745544,
			0.6072396039962769,
			-0.5197031497955322,
			3.8954057693481445,
			-1.2873553037643433,
			-0.3663747012615204,
			0.904171884059906,
			-0.21958068013191223,
			0.7658095955848694,
			0.7271782159805298,
			-0.43317946791648865,
			3.8666024208068848,
			-0.9465081095695496,
			-0.32837915420532227,
			0.9441511034965515,
			0.02624591812491417,
			0.7735013365745544,
			0.6072396636009216,
			-0.9607597589492798,
			3.5956859588623047,
			-0.9252867698669434,
			-0.5320291519165039,
			0.8451490998268127,
			0.05151524394750595,
			0.9630098342895508,
			0.6067671775817871,
			-0.9730956554412842,
			3.5558762550354004,
			-1.4247565269470215,
			-0.5259864926338196,
			0.7790765166282654,
			-0.3410748541355133,
			0.962746798992157,
			0.7726150453090668,
			0.06871791183948517,
			3.943297863006592,
			-1.4870870113372803,
			0.143589586019516,
			-0.9660634398460388,
			0.2146672010421753,
			0.5686948895454407,
			0.7735066115856171,
			0.08105333149433136,
			3.9831085205078125,
			-0.9876177310943604,
			0.14651936292648315,
			-0.9891659021377563,
			-0.004272591322660446,
			0.5689578056335449,
			0.6076587438583374,
			0.06871791183948517,
			3.943297863006592,
			-1.4870870113372803,
			-0.13602100312709808,
			0.9280068278312683,
			-0.34681233763694763,
			0.5686948895454407,
			0.7735066115856171,
			0.08105333149433136,
			3.9831085205078125,
			-0.9876177310943604,
			-0.14651936292648315,
			0.9891659021377563,
			0.004272591322660446,
			0.5689578056335449,
			0.6076587438583374,
			0.10508318245410919,
			3.812964916229248,
			-1.7480573654174805,
			0.10608233511447906,
			-0.7992187142372131,
			0.5915707945823669,
			0.5685634613037109,
			0.8564305752515793,
			-0.45643192529678345,
			3.8164706230163574,
			-1.6146384477615356,
			0.31223487854003906,
			-0.7877437472343445,
			0.5309610366821289,
			0.7722005248069763,
			0.8333467841148376,
			-0.9367296695709229,
			3.4255428314208984,
			-1.6857261657714844,
			0.47105318307876587,
			-0.6419873833656311,
			0.6049073934555054,
			0.9626153707504272,
			0.8555389940738678,
			0.19664032757282257,
			3.5792980194091797,
			-1.919114589691162,
			-0.12015137076377869,
			0.82656329870224,
			-0.5498214960098267,
			0.5684320330619812,
			0.9393545314669609,
			-0.33750638365745544,
			3.621634006500244,
			-1.8818535804748535,
			-0.2846156060695648,
			0.7717520594596863,
			-0.5686208605766296,
			0.7785912156105042,
			0.9395153783261776,
			-0.8455697298049927,
			3.2026748657226562,
			-1.831135869026184,
			-0.4776757061481476,
			0.670400083065033,
			-0.5677663683891296,
			0.9624839425086975,
			0.9384629353880882,
			-0.33750638365745544,
			3.621634006500244,
			-1.8818535804748535,
			0.23386333882808685,
			-0.6292611360549927,
			0.7411419749259949,
			0.7785913348197937,
			0.9395153932273388,
			-0.8455697298049927,
			3.2026748657226562,
			-1.831135869026184,
			0.41502121090888977,
			-0.5251625180244446,
			0.7429120540618896,
			0.9624839425086975,
			0.9384629353880882,
			0.19664032757282257,
			3.5792980194091797,
			-1.919114589691162,
			0.08267464488744736,
			-0.6924344897270203,
			0.7166966795921326,
			0.5684320330619812,
			0.9393545314669609,
			1.0499135255813599,
			4.0059590339660645,
			-0.8254679441452026,
			-0.17032380402088165,
			-0.9323709607124329,
			-0.3188268542289734,
			0.7658095955848694,
			0.7271782159805298,
			0.7425216436386108,
			4.092460632324219,
			-1.3130661249160767,
			-0.07818841934204102,
			-0.9873348474502563,
			-0.13782158493995667,
			0.962746798992157,
			0.7726150453090668,
			0.41693755984306335,
			3.989954710006714,
			-0.9460586905479431,
			0.08655048906803131,
			-0.940092146396637,
			-0.32966095209121704,
			0.9630098342895508,
			0.6067671775817871,
			0.8582907319068909,
			3.8449246883392334,
			-0.5767883062362671,
			-0.09372234344482422,
			-0.8843348622322083,
			-0.45728933811187744,
			0.7735013365745544,
			0.6072396039962769,
			1.0499135255813599,
			4.0059590339660645,
			-0.8254679441452026,
			0.22681355476379395,
			0.9410077333450317,
			0.25098422169685364,
			0.7658095955848694,
			0.7271782159805298,
			0.8582907319068909,
			3.8449246883392334,
			-0.5767883062362671,
			0.09372234344482422,
			0.8843348622322083,
			0.45728933811187744,
			0.7735013365745544,
			0.6072396636009216,
			0.41693755984306335,
			3.989954710006714,
			-0.9460586905479431,
			-0.08655048906803131,
			0.940092146396637,
			0.32966095209121704,
			0.9630098342895508,
			0.6067671775817871,
			0.7425216436386108,
			4.092460632324219,
			-1.3130661249160767,
			0.1675160974264145,
			0.9855037331581116,
			0.026520583778619766,
			0.962746798992157,
			0.7726150453090668,
			1.578188180923462,
			3.7053773403167725,
			-0.6876184940338135,
			-0.38575395941734314,
			-0.8387401700019836,
			-0.38428908586502075,
			0.5686948895454407,
			0.7735066115856171,
			1.2526042461395264,
			3.602872133255005,
			-0.3206111490726471,
			-0.23963133990764618,
			-0.8033081889152527,
			-0.5451521277427673,
			0.5689578056335449,
			0.6076587438583374,
			1.578188180923462,
			3.7053773403167725,
			-0.6876184940338135,
			0.4694052040576935,
			0.8390759229660034,
			0.27488020062446594,
			0.5686948895454407,
			0.7735066115856171,
			1.2526042461395264,
			3.602872133255005,
			-0.3206111490726471,
			0.23963133990764618,
			0.8033081889152527,
			0.5451521277427673,
			0.5689578056335449,
			0.6076587438583374,
			1.7383031845092773,
			3.6525156497955322,
			-0.9284161329269409,
			-0.6147343516349792,
			-0.7875301241874695,
			-0.043336283415555954,
			0.5685634613037109,
			0.8564305752515793,
			1.2905941009521484,
			3.988687753677368,
			-1.0686198472976685,
			-0.4379405975341797,
			-0.8989531993865967,
			0.008026367984712124,
			0.7722005248069763,
			0.8333467841148376,
			0.9026365280151367,
			4.039597988128662,
			-1.5538631677627563,
			-0.33909115195274353,
			-0.9163792729377747,
			0.21262244880199432,
			0.9626153707504272,
			0.8555389940738678,
			1.8359239101409912,
			3.467454195022583,
			-1.148566484451294,
			0.5860774517059326,
			0.8060243725776672,
			0.08236945420503616,
			0.5684320330619812,
			0.9393545314669609,
			1.4855396747589111,
			3.837259531021118,
			-1.3187682628631592,
			0.4762108325958252,
			0.8787194490432739,
			-0.0318002849817276,
			0.7785912156105042,
			0.9395153783261776,
			0.9858551621437073,
			3.8562190532684326,
			-1.7502580881118774,
			0.3187353014945984,
			0.9319131970405579,
			-0.17294839024543762,
			0.9624839425086975,
			0.9384629353880882,
			1.4855396747589111,
			3.837259531021118,
			-1.3187682628631592,
			-0.5798822045326233,
			-0.7859736680984497,
			0.2142704576253891,
			0.7785913348197937,
			0.9395153932273388,
			0.9858551621437073,
			3.8562190532684326,
			-1.7502580881118774,
			-0.430890828371048,
			-0.8300729393959045,
			0.35395365953445435,
			0.9624839425086975,
			0.9384629353880882,
			1.8359239101409912,
			3.467454195022583,
			-1.148566484451294,
			-0.6802575588226318,
			-0.7265236377716064,
			0.09662160277366638,
			0.5684320330619812,
			0.9393545314669609,
			-1.0082993507385254,
			4.287639617919922,
			-0.9152424335479736,
			0.1902829110622406,
			-0.9571214914321899,
			-0.21826837956905365,
			0.3931775987148285,
			0.6214362382888794,
			-1.1394528150558472,
			4.288787841796875,
			-1.115234613418579,
			0.26770836114883423,
			-0.9616076946258545,
			-0.06015198305249214,
			0.4949337840080261,
			0.6364588737487793,
			-1.2615952491760254,
			4.197329998016357,
			-0.9658147692680359,
			0.36945706605911255,
			-0.8936735391616821,
			-0.2545854151248932,
			0.4853841960430145,
			0.5503576993942261,
			-1.076074242591858,
			4.224477767944336,
			-0.7975440621376038,
			0.2602313160896301,
			-0.904263436794281,
			-0.33838921785354614,
			0.37702473998069763,
			0.5627982318401337,
			-1.0082993507385254,
			4.287639617919922,
			-0.9152424335479736,
			-0.1902829110622406,
			0.9571214914321899,
			0.21826837956905365,
			0.3931775987148285,
			0.6214362382888794,
			-1.076074242591858,
			4.224477767944336,
			-0.7975440621376038,
			-0.2602313160896301,
			0.904263436794281,
			0.33838921785354614,
			0.37702473998069763,
			0.562798261642456,
			-1.2615952491760254,
			4.197329998016357,
			-0.9658147692680359,
			-0.36945706605911255,
			0.8936735391616821,
			0.2545854151248932,
			0.4853841960430145,
			0.5503576993942261,
			-1.1394528150558472,
			4.288787841796875,
			-1.115234613418579,
			-0.26770836114883423,
			0.9616076946258545,
			0.06015198305249214,
			0.4949337840080261,
			0.6364588737487793,
			-0.7734922170639038,
			4.288604259490967,
			-0.8161935210227966,
			0.002471999265253544,
			-0.9554429650306702,
			-0.2951139807701111,
			0.29044729471206665,
			0.6599355638027191,
			-0.8956343531608582,
			4.197145938873291,
			-0.6667738556861877,
			0.1658986210823059,
			-0.9000213742256165,
			-0.4029969274997711,
			0.28089770674705505,
			0.5738343894481659,
			-0.7734922170639038,
			4.288604259490967,
			-0.8161935210227966,
			-0.002471999265253544,
			0.9554429650306702,
			0.2951139807701111,
			0.29044729471206665,
			0.6599355638027191,
			-0.8956343531608582,
			4.197145938873291,
			-0.6667738556861877,
			-0.1658986210823059,
			0.9000213742256165,
			0.4029969274997711,
			0.28089770674705505,
			0.5738343894481659,
			-0.6149815917015076,
			4.262179851531982,
			-1.0080395936965942,
			-0.11276589334011078,
			-0.9707937836647034,
			-0.21170690655708313,
			0.29999691247940063,
			0.7460367381572723,
			-0.8021098375320435,
			4.354767799377441,
			-1.1043344736099243,
			0.02615436166524887,
			-0.9963377714157104,
			-0.08139286190271378,
			0.3886107802391052,
			0.7358631789684296,
			-0.9809425473213196,
			4.262363433837891,
			-1.3070805072784424,
			0.18900112807750702,
			-0.9789727330207825,
			0.07632679492235184,
			0.5044834017753601,
			0.7225600481033325,
			-0.6149815917015076,
			4.262179851531982,
			-1.0080395936965942,
			0.11276589334011078,
			0.9707937836647034,
			0.21170690655708313,
			0.29999691247940063,
			0.7460367381572723,
			-0.8021098375320435,
			4.354767799377441,
			-1.1043344736099243,
			-0.02615436166524887,
			0.9963377714157104,
			0.08139286190271378,
			0.38861075043678284,
			0.7358631789684296,
			-0.9809425473213196,
			4.262363433837891,
			-1.3070805072784424,
			-0.18900112807750702,
			0.9789727330207825,
			-0.07632679492235184,
			0.5044834017753601,
			0.7225600481033325,
			-1.2560834884643555,
			4.268129348754883,
			-0.7966365814208984,
			-0.08420056849718094,
			-0.9954832792282104,
			-0.04358043149113655,
			0.3931775987148285,
			0.6214362382888794,
			-1.4184489250183105,
			4.247896671295166,
			-0.537805438041687,
			0.027253028005361557,
			-0.983367383480072,
			-0.17938779294490814,
			0.4949337840080261,
			0.6364588737487793,
			-1.1616772413253784,
			4.182477951049805,
			-0.4703126549720764,
			-0.20081178843975067,
			-0.9602344036102295,
			-0.19391460716724396,
			0.4853841960430145,
			0.5503576993942261,
			-1.0706154108047485,
			4.223459720611572,
			-0.7770260572433472,
			-0.2300790399312973,
			-0.9713431000709534,
			-0.05945005640387535,
			0.37702473998069763,
			0.5627982318401337,
			-1.2560834884643555,
			4.268129348754883,
			-0.7966365814208984,
			0.08420056849718094,
			0.9954832792282104,
			0.04358043149113655,
			0.3931775987148285,
			0.6214362382888794,
			-1.0706154108047485,
			4.223459720611572,
			-0.7770260572433472,
			0.2300790399312973,
			0.9713431000709534,
			0.05945005640387535,
			0.37702473998069763,
			0.562798261642456,
			-1.1616772413253784,
			4.182477951049805,
			-0.4703126549720764,
			0.20081178843975067,
			0.9602344036102295,
			0.19391460716724396,
			0.4853841960430145,
			0.5503576993942261,
			-1.4184489250183105,
			4.247896671295166,
			-0.537805438041687,
			-0.027253028005361557,
			0.983367383480072,
			0.17938779294490814,
			0.4949337840080261,
			0.6364588737487793,
			-1.2630562782287598,
			4.254516124725342,
			-1.1225666999816895,
			-0.07815790176391602,
			-0.9841609001159668,
			0.1589404046535492,
			0.29044729471206665,
			0.6599355638027191,
			-1.0062847137451172,
			4.189096927642822,
			-1.0550739765167236,
			-0.25101473927497864,
			-0.9665212035179138,
			0.05291909724473953,
			0.28089770674705505,
			0.5738343894481659,
			-1.2630562782287598,
			4.254516124725342,
			-1.1225666999816895,
			0.07815790176391602,
			0.9841609001159668,
			-0.1589404046535492,
			0.29044729471206665,
			0.6599355638027191,
			-1.0062847137451172,
			4.189096927642822,
			-1.0550739765167236,
			0.25101473927497864,
			0.9665212035179138,
			-0.05291909724473953,
			0.28089770674705505,
			0.5738343894481659,
			-1.5575463771820068,
			4.157795429229736,
			-1.2037228345870972,
			0.045594654977321625,
			-0.9721671342849731,
			0.2297128140926361,
			0.29999691247940063,
			0.7460367381572723,
			-1.5952858924865723,
			4.282166004180908,
			-0.9395953416824341,
			0.1116672232747078,
			-0.9924619197845459,
			0.050355538725852966,
			0.3886107802391052,
			0.7358631789684296,
			-1.7129387855529785,
			4.1511759757995605,
			-0.6189613342285156,
			0.18436232209205627,
			-0.9690847396850586,
			-0.16379283368587494,
			0.5044834017753601,
			0.7225600481033325,
			-1.5575463771820068,
			4.157795429229736,
			-1.2037228345870972,
			-0.045594654977321625,
			0.9721671342849731,
			-0.2297128140926361,
			0.29999691247940063,
			0.7460367381572723,
			-1.5952858924865723,
			4.282166004180908,
			-0.9395953416824341,
			-0.1116672232747078,
			0.9924619197845459,
			-0.050355538725852966,
			0.38861075043678284,
			0.7358631789684296,
			-1.7129387855529785,
			4.1511759757995605,
			-0.6189613342285156,
			-0.18436232209205627,
			0.9690847396850586,
			0.16379283368587494,
			0.5044834017753601,
			0.7225600481033325,
			-0.24921166896820068,
			3.892393112182617,
			-0.9152956008911133,
			0.08371227234601974,
			-0.9950559735298157,
			0.05294961482286453,
			0.3931775987148285,
			0.6214362382888794,
			-0.06362125277519226,
			3.8724470138549805,
			-1.1580380201339722,
			-0.0397961363196373,
			-0.983214795589447,
			0.17789238691329956,
			0.4949337840080261,
			0.6364588737487793,
			-0.31282785534858704,
			3.805887460708618,
			-1.2487709522247314,
			0.18585772812366486,
			-0.9591051936149597,
			0.2133243829011917,
			0.4853841960430145,
			0.5503576993942261,
			-0.4319092035293579,
			3.8469412326812744,
			-0.9518212676048279,
			0.22742393612861633,
			-0.9703055024147034,
			0.08215582370758057,
			0.37702473998069763,
			0.5627982318401337,
			-0.24921166896820068,
			3.892393112182617,
			-0.9152956008911133,
			-0.08371227234601974,
			0.9950559735298157,
			-0.05294961482286453,
			0.3931775987148285,
			0.6214362382888794,
			-0.4319092035293579,
			3.8469412326812744,
			-0.9518212676048279,
			-0.22742393612861633,
			0.9703055024147034,
			-0.08215582370758057,
			0.37702473998069763,
			0.562798261642456,
			-0.31282785534858704,
			3.805887460708618,
			-1.2487709522247314,
			-0.18585772812366486,
			0.9591051936149597,
			-0.2133243829011917,
			0.4853841960430145,
			0.5503576993942261,
			-0.06362125277519226,
			3.8724470138549805,
			-1.1580380201339722,
			0.0397961363196373,
			0.983214795589447,
			-0.17789238691329956,
			0.4949337840080261,
			0.6364588737487793,
			-0.2722317576408386,
			3.8792788982391357,
			-0.5900842547416687,
			0.09631641209125519,
			-0.9840693473815918,
			-0.14926603436470032,
			0.29044729471206665,
			0.6599355638027191,
			-0.5214381814002991,
			3.8127188682556152,
			-0.6808171272277832,
			0.25861385464668274,
			-0.965575098991394,
			-0.02783288061618805,
			0.28089770674705505,
			0.5738343894481659,
			-0.2722317576408386,
			3.8792788982391357,
			-0.5900842547416687,
			-0.09631641209125519,
			0.9840693473815918,
			0.14926603436470032,
			0.29044729471206665,
			0.6599355638027191,
			-0.5214381814002991,
			3.8127188682556152,
			-0.6808171272277832,
			-0.25861385464668274,
			0.965575098991394,
			0.02783288061618805,
			0.28089770674705505,
			0.5738343894481659,
			0.013909339904785156,
			3.7838737964630127,
			-0.48197853565216064,
			-0.020447401329874992,
			-0.9726859331130981,
			-0.2311777025461197,
			0.29999691247940063,
			0.7460367381572723,
			0.07532578706741333,
			3.908015251159668,
			-0.7417333722114563,
			-0.10266426205635071,
			-0.9929807186126709,
			-0.05862605571746826,
			0.3886107802391052,
			0.7358631789684296,
			0.22251957654953003,
			3.7770419120788574,
			-1.049932599067688,
			-0.19486068189144135,
			-0.9696035385131836,
			0.14786218106746674,
			0.5044834017753601,
			0.7225600481033325,
			0.013909339904785156,
			3.7838737964630127,
			-0.48197853565216064,
			0.020447401329874992,
			0.9726859331130981,
			0.2311777025461197,
			0.29999691247940063,
			0.7460367381572723,
			0.07532578706741333,
			3.908015251159668,
			-0.7417333722114563,
			0.10266426205635071,
			0.9929807186126709,
			0.05862605571746826,
			0.38861075043678284,
			0.7358631789684296,
			0.22251957654953003,
			3.7770419120788574,
			-1.049932599067688,
			0.19486068189144135,
			0.9696035385131836,
			-0.14786218106746674,
			0.5044834017753601,
			0.7225600481033325
		],
		"indices": [
			0,
			1,
			2,
			2,
			3,
			0,
			3,
			2,
			4,
			4,
			5,
			3,
			5,
			4,
			6,
			6,
			7,
			5,
			7,
			6,
			8,
			8,
			9,
			7,
			10,
			11,
			12,
			12,
			13,
			10,
			13,
			12,
			14,
			14,
			15,
			13,
			15,
			14,
			16,
			16,
			17,
			15,
			17,
			16,
			18,
			18,
			19,
			17,
			19,
			18,
			20,
			20,
			21,
			19,
			21,
			20,
			22,
			22,
			23,
			21,
			23,
			22,
			24,
			24,
			25,
			23,
			25,
			24,
			26,
			26,
			27,
			25,
			27,
			26,
			28,
			28,
			29,
			27,
			29,
			28,
			30,
			30,
			31,
			29,
			31,
			30,
			32,
			32,
			33,
			31,
			33,
			32,
			1,
			1,
			0,
			33,
			34,
			35,
			36,
			36,
			37,
			34,
			38,
			39,
			35,
			35,
			34,
			38,
			40,
			41,
			39,
			39,
			38,
			40,
			42,
			43,
			41,
			41,
			40,
			42,
			44,
			45,
			43,
			43,
			42,
			44,
			46,
			47,
			45,
			45,
			44,
			46,
			48,
			49,
			47,
			47,
			46,
			48,
			50,
			51,
			49,
			49,
			48,
			50,
			52,
			53,
			51,
			51,
			50,
			52,
			54,
			55,
			53,
			53,
			52,
			54,
			56,
			57,
			55,
			55,
			54,
			56,
			58,
			59,
			57,
			57,
			56,
			58,
			60,
			61,
			62,
			62,
			63,
			60,
			64,
			65,
			61,
			61,
			60,
			64,
			66,
			67,
			65,
			65,
			64,
			66,
			37,
			36,
			67,
			67,
			66,
			37,
			68,
			69,
			70,
			70,
			71,
			68,
			72,
			73,
			74,
			74,
			75,
			72,
			76,
			77,
			70,
			70,
			69,
			76,
			76,
			78,
			79,
			79,
			77,
			76,
			80,
			72,
			75,
			75,
			81,
			80,
			78,
			82,
			83,
			83,
			79,
			78,
			84,
			85,
			86,
			86,
			87,
			84,
			88,
			89,
			90,
			90,
			91,
			88,
			92,
			84,
			87,
			87,
			93,
			92,
			94,
			88,
			91,
			91,
			95,
			94,
			85,
			96,
			97,
			97,
			86,
			85,
			98,
			99,
			100,
			100,
			101,
			98,
			89,
			102,
			103,
			103,
			90,
			89,
			99,
			94,
			95,
			95,
			100,
			99,
			100,
			95,
			104,
			104,
			105,
			100,
			91,
			90,
			106,
			106,
			107,
			91,
			93,
			87,
			108,
			108,
			109,
			93,
			101,
			100,
			105,
			105,
			110,
			101,
			95,
			91,
			107,
			107,
			104,
			95,
			90,
			103,
			111,
			111,
			106,
			90,
			87,
			86,
			112,
			112,
			108,
			87,
			86,
			97,
			113,
			113,
			112,
			86,
			114,
			115,
			94,
			94,
			99,
			114,
			116,
			117,
			102,
			102,
			89,
			116,
			118,
			114,
			99,
			99,
			98,
			118,
			119,
			120,
			96,
			96,
			85,
			119,
			115,
			121,
			88,
			88,
			94,
			115,
			122,
			123,
			84,
			84,
			92,
			122,
			121,
			116,
			89,
			89,
			88,
			121,
			123,
			119,
			85,
			85,
			84,
			123,
			120,
			118,
			98,
			98,
			96,
			120,
			97,
			101,
			110,
			110,
			113,
			97,
			96,
			98,
			101,
			101,
			97,
			96,
			73,
			68,
			71,
			71,
			74,
			73,
			124,
			125,
			126,
			126,
			127,
			124,
			81,
			128,
			129,
			129,
			130,
			81,
			125,
			131,
			132,
			132,
			126,
			125,
			133,
			124,
			127,
			127,
			134,
			133,
			135,
			133,
			134,
			134,
			136,
			135,
			128,
			135,
			136,
			136,
			129,
			128,
			131,
			137,
			138,
			138,
			132,
			131,
			139,
			140,
			141,
			141,
			142,
			139,
			143,
			144,
			145,
			145,
			146,
			143,
			147,
			148,
			149,
			149,
			150,
			147,
			144,
			151,
			152,
			152,
			145,
			144,
			151,
			147,
			150,
			150,
			152,
			151,
			153,
			154,
			155,
			155,
			156,
			153,
			157,
			158,
			159,
			159,
			160,
			157,
			148,
			153,
			156,
			156,
			149,
			148,
			154,
			157,
			160,
			160,
			155,
			154,
			158,
			139,
			142,
			142,
			159,
			158,
			159,
			142,
			161,
			161,
			162,
			159,
			145,
			152,
			163,
			163,
			164,
			145,
			149,
			156,
			165,
			165,
			166,
			149,
			160,
			159,
			162,
			162,
			167,
			160,
			146,
			145,
			164,
			164,
			168,
			146,
			155,
			160,
			167,
			167,
			169,
			155,
			150,
			149,
			166,
			166,
			170,
			150,
			142,
			141,
			171,
			171,
			161,
			142,
			152,
			150,
			170,
			170,
			163,
			152,
			156,
			155,
			169,
			169,
			165,
			156,
			172,
			173,
			174,
			174,
			175,
			172,
			176,
			177,
			178,
			178,
			179,
			176,
			180,
			172,
			175,
			175,
			181,
			180,
			182,
			183,
			177,
			177,
			176,
			182,
			184,
			185,
			172,
			172,
			180,
			184,
			185,
			186,
			173,
			173,
			172,
			185,
			187,
			182,
			176,
			176,
			188,
			187,
			188,
			176,
			179,
			179,
			189,
			188,
			190,
			191,
			192,
			192,
			193,
			190,
			194,
			195,
			196,
			196,
			197,
			194,
			198,
			190,
			193,
			193,
			199,
			198,
			191,
			194,
			197,
			197,
			192,
			191,
			195,
			200,
			201,
			201,
			196,
			195,
			200,
			202,
			203,
			203,
			201,
			200,
			202,
			204,
			205,
			205,
			203,
			202,
			206,
			207,
			208,
			208,
			209,
			206,
			210,
			211,
			212,
			212,
			213,
			210,
			214,
			215,
			216,
			216,
			217,
			214,
			218,
			210,
			213,
			213,
			219,
			218,
			207,
			214,
			217,
			217,
			208,
			207,
			215,
			220,
			221,
			221,
			216,
			215,
			220,
			218,
			219,
			219,
			221,
			220,
			217,
			216,
			222,
			222,
			223,
			217,
			208,
			217,
			223,
			223,
			224,
			208,
			221,
			219,
			225,
			225,
			226,
			221,
			216,
			221,
			226,
			226,
			222,
			216,
			209,
			208,
			224,
			224,
			227,
			209,
			213,
			212,
			228,
			228,
			229,
			213,
			219,
			213,
			229,
			229,
			225,
			219,
			230,
			231,
			232,
			232,
			233,
			230,
			233,
			232,
			234,
			234,
			235,
			233,
			236,
			237,
			238,
			238,
			239,
			236,
			239,
			238,
			231,
			231,
			230,
			239,
			235,
			234,
			240,
			240,
			241,
			235,
			242,
			243,
			244,
			244,
			245,
			242,
			245,
			244,
			237,
			237,
			236,
			245,
			246,
			247,
			248,
			248,
			249,
			246,
			250,
			251,
			252,
			252,
			253,
			250,
			247,
			254,
			255,
			255,
			248,
			247,
			251,
			246,
			249,
			249,
			252,
			251,
			256,
			250,
			253,
			253,
			257,
			256,
			258,
			256,
			257,
			257,
			259,
			258,
			260,
			261,
			262,
			262,
			263,
			260,
			264,
			265,
			266,
			266,
			267,
			264,
			268,
			269,
			270,
			270,
			271,
			268,
			265,
			260,
			263,
			263,
			266,
			265,
			269,
			264,
			267,
			267,
			270,
			269,
			248,
			255,
			272,
			272,
			273,
			248,
			253,
			252,
			274,
			274,
			275,
			253,
			259,
			257,
			276,
			276,
			277,
			259,
			252,
			249,
			278,
			278,
			274,
			252,
			257,
			253,
			275,
			275,
			276,
			257,
			249,
			248,
			273,
			273,
			278,
			249,
			222,
			226,
			279,
			279,
			280,
			222,
			227,
			224,
			281,
			281,
			282,
			227,
			229,
			228,
			283,
			283,
			284,
			229,
			225,
			229,
			284,
			284,
			285,
			225,
			223,
			222,
			280,
			280,
			286,
			223,
			224,
			223,
			286,
			286,
			281,
			224,
			226,
			225,
			285,
			285,
			279,
			226,
			196,
			201,
			287,
			287,
			288,
			196,
			203,
			205,
			289,
			289,
			290,
			203,
			193,
			192,
			291,
			291,
			292,
			193,
			197,
			196,
			288,
			288,
			293,
			197,
			201,
			203,
			290,
			290,
			287,
			201,
			199,
			193,
			292,
			292,
			294,
			199,
			192,
			197,
			293,
			293,
			291,
			192,
			267,
			266,
			295,
			295,
			296,
			267,
			270,
			267,
			296,
			296,
			297,
			270,
			263,
			262,
			298,
			298,
			299,
			263,
			266,
			263,
			299,
			299,
			295,
			266,
			271,
			270,
			297,
			297,
			300,
			271,
			301,
			302,
			303,
			303,
			304,
			301,
			305,
			306,
			307,
			307,
			308,
			305,
			309,
			310,
			311,
			311,
			312,
			309,
			310,
			305,
			308,
			308,
			311,
			310,
			313,
			301,
			304,
			304,
			314,
			313,
			315,
			309,
			312,
			312,
			316,
			315,
			317,
			318,
			319,
			319,
			320,
			317,
			302,
			315,
			316,
			316,
			303,
			302,
			306,
			317,
			320,
			320,
			307,
			306,
			307,
			320,
			321,
			321,
			322,
			307,
			304,
			303,
			323,
			323,
			324,
			304,
			312,
			311,
			325,
			325,
			326,
			312,
			311,
			308,
			327,
			327,
			325,
			311,
			314,
			304,
			324,
			324,
			328,
			314,
			316,
			312,
			326,
			326,
			329,
			316,
			308,
			307,
			322,
			322,
			327,
			308,
			320,
			319,
			330,
			330,
			321,
			320,
			303,
			316,
			329,
			329,
			323,
			303,
			321,
			330,
			331,
			331,
			332,
			321,
			323,
			329,
			333,
			333,
			334,
			323,
			322,
			321,
			332,
			332,
			335,
			322,
			324,
			323,
			334,
			334,
			336,
			324,
			326,
			325,
			337,
			337,
			338,
			326,
			325,
			327,
			339,
			339,
			337,
			325,
			328,
			324,
			336,
			336,
			340,
			328,
			329,
			326,
			338,
			338,
			333,
			329,
			327,
			322,
			335,
			335,
			339,
			327,
			341,
			342,
			343,
			343,
			344,
			341,
			345,
			346,
			347,
			347,
			348,
			345,
			344,
			343,
			349,
			349,
			350,
			344,
			348,
			347,
			351,
			351,
			352,
			348,
			353,
			354,
			355,
			355,
			356,
			353,
			357,
			358,
			354,
			354,
			353,
			357,
			352,
			351,
			359,
			359,
			360,
			352,
			356,
			355,
			346,
			346,
			345,
			356,
			350,
			349,
			358,
			358,
			357,
			350,
			361,
			362,
			363,
			363,
			364,
			361,
			365,
			366,
			367,
			367,
			368,
			365,
			369,
			370,
			371,
			371,
			372,
			369,
			364,
			363,
			373,
			373,
			374,
			364,
			374,
			373,
			375,
			375,
			376,
			374,
			376,
			375,
			366,
			366,
			365,
			376,
			368,
			367,
			370,
			370,
			369,
			368,
			362,
			377,
			378,
			378,
			363,
			362,
			366,
			379,
			380,
			380,
			367,
			366,
			370,
			381,
			382,
			382,
			371,
			370,
			373,
			383,
			384,
			384,
			375,
			373,
			363,
			378,
			383,
			383,
			373,
			363,
			375,
			384,
			379,
			379,
			366,
			375,
			367,
			380,
			381,
			381,
			370,
			367,
			385,
			386,
			387,
			387,
			388,
			385,
			389,
			390,
			391,
			391,
			392,
			389,
			388,
			387,
			393,
			393,
			394,
			388,
			392,
			391,
			395,
			395,
			396,
			392,
			394,
			393,
			397,
			397,
			398,
			394,
			396,
			395,
			386,
			386,
			385,
			396,
			399,
			400,
			390,
			390,
			389,
			399,
			398,
			397,
			401,
			401,
			402,
			398,
			403,
			404,
			400,
			400,
			399,
			403,
			405,
			403,
			399,
			399,
			406,
			405,
			407,
			398,
			402,
			402,
			408,
			407,
			406,
			399,
			389,
			389,
			409,
			406,
			410,
			396,
			385,
			385,
			411,
			410,
			412,
			394,
			398,
			398,
			407,
			412,
			413,
			392,
			396,
			396,
			410,
			413,
			414,
			388,
			394,
			394,
			412,
			414,
			409,
			389,
			392,
			392,
			413,
			409,
			411,
			385,
			388,
			388,
			414,
			411,
			415,
			416,
			417,
			417,
			418,
			415,
			419,
			420,
			421,
			421,
			422,
			419,
			423,
			415,
			418,
			418,
			424,
			423,
			425,
			426,
			420,
			420,
			419,
			425,
			427,
			428,
			415,
			415,
			423,
			427,
			428,
			429,
			416,
			416,
			415,
			428,
			430,
			425,
			419,
			419,
			431,
			430,
			431,
			419,
			422,
			422,
			432,
			431,
			433,
			434,
			435,
			435,
			436,
			433,
			437,
			438,
			439,
			439,
			440,
			437,
			441,
			433,
			436,
			436,
			442,
			441,
			443,
			444,
			438,
			438,
			437,
			443,
			445,
			446,
			433,
			433,
			441,
			445,
			446,
			447,
			434,
			434,
			433,
			446,
			448,
			443,
			437,
			437,
			449,
			448,
			449,
			437,
			440,
			440,
			450,
			449,
			451,
			452,
			453,
			453,
			454,
			451,
			455,
			456,
			457,
			457,
			458,
			455,
			459,
			451,
			454,
			454,
			460,
			459,
			461,
			462,
			456,
			456,
			455,
			461,
			463,
			464,
			451,
			451,
			459,
			463,
			464,
			465,
			452,
			452,
			451,
			464,
			466,
			461,
			455,
			455,
			467,
			466,
			467,
			455,
			458,
			458,
			468,
			467,
			469,
			470,
			471,
			471,
			472,
			469,
			473,
			474,
			475,
			475,
			476,
			473,
			477,
			469,
			472,
			472,
			478,
			477,
			479,
			480,
			474,
			474,
			473,
			479,
			481,
			482,
			469,
			469,
			477,
			481,
			482,
			483,
			470,
			470,
			469,
			482,
			484,
			479,
			473,
			473,
			485,
			484,
			485,
			473,
			476,
			476,
			486,
			485,
			487,
			488,
			489,
			489,
			490,
			487,
			491,
			492,
			493,
			493,
			494,
			491,
			495,
			487,
			490,
			490,
			496,
			495,
			497,
			498,
			492,
			492,
			491,
			497,
			499,
			500,
			487,
			487,
			495,
			499,
			500,
			501,
			488,
			488,
			487,
			500,
			502,
			497,
			491,
			491,
			503,
			502,
			503,
			491,
			494,
			494,
			504,
			503,
			505,
			506,
			507,
			507,
			508,
			505,
			509,
			510,
			511,
			511,
			512,
			509,
			513,
			505,
			508,
			508,
			514,
			513,
			515,
			516,
			510,
			510,
			509,
			515,
			517,
			518,
			505,
			505,
			513,
			517,
			518,
			519,
			506,
			506,
			505,
			518,
			520,
			515,
			509,
			509,
			521,
			520,
			521,
			509,
			512,
			512,
			522,
			521,
			523,
			524,
			525,
			525,
			526,
			523,
			527,
			528,
			529,
			529,
			530,
			527,
			531,
			523,
			526,
			526,
			532,
			531,
			533,
			534,
			528,
			528,
			527,
			533,
			535,
			536,
			523,
			523,
			531,
			535,
			536,
			537,
			524,
			524,
			523,
			536,
			538,
			533,
			527,
			527,
			539,
			538,
			539,
			527,
			530,
			530,
			540,
			539,
			541,
			542,
			543,
			543,
			544,
			541,
			545,
			546,
			547,
			547,
			548,
			545,
			549,
			541,
			544,
			544,
			550,
			549,
			551,
			552,
			546,
			546,
			545,
			551,
			553,
			554,
			541,
			541,
			549,
			553,
			554,
			555,
			542,
			542,
			541,
			554,
			556,
			551,
			545,
			545,
			557,
			556,
			557,
			545,
			548,
			548,
			558,
			557,
			559,
			560,
			561,
			561,
			562,
			559,
			563,
			564,
			565,
			565,
			566,
			563,
			567,
			559,
			562,
			562,
			568,
			567,
			569,
			570,
			564,
			564,
			563,
			569,
			571,
			572,
			559,
			559,
			567,
			571,
			572,
			573,
			560,
			560,
			559,
			572,
			574,
			569,
			563,
			563,
			575,
			574,
			575,
			563,
			566,
			566,
			576,
			575,
			577,
			578,
			579,
			579,
			580,
			577,
			581,
			582,
			583,
			583,
			584,
			581,
			585,
			577,
			580,
			580,
			586,
			585,
			587,
			588,
			582,
			582,
			581,
			587,
			589,
			590,
			577,
			577,
			585,
			589,
			590,
			591,
			578,
			578,
			577,
			590,
			592,
			587,
			581,
			581,
			593,
			592,
			593,
			581,
			584,
			584,
			594,
			593,
			35,
			33,
			0,
			0,
			36,
			35,
			39,
			31,
			33,
			33,
			35,
			39,
			41,
			29,
			31,
			31,
			39,
			41,
			43,
			27,
			29,
			29,
			41,
			43,
			45,
			25,
			27,
			27,
			43,
			45,
			47,
			23,
			25,
			25,
			45,
			47,
			49,
			21,
			23,
			23,
			47,
			49,
			51,
			19,
			21,
			21,
			49,
			51,
			53,
			17,
			19,
			19,
			51,
			53,
			55,
			15,
			17,
			17,
			53,
			55,
			57,
			13,
			15,
			15,
			55,
			57,
			59,
			10,
			13,
			13,
			57,
			59,
			61,
			7,
			9,
			9,
			62,
			61,
			65,
			5,
			7,
			7,
			61,
			65,
			67,
			3,
			5,
			5,
			65,
			67,
			36,
			0,
			3,
			3,
			67,
			36,
			595,
			596,
			597,
			597,
			598,
			595,
			599,
			600,
			601,
			601,
			602,
			599,
			603,
			595,
			598,
			598,
			604,
			603,
			605,
			606,
			600,
			600,
			599,
			605,
			607,
			608,
			595,
			595,
			603,
			607,
			608,
			609,
			596,
			596,
			595,
			608,
			610,
			605,
			599,
			599,
			611,
			610,
			611,
			599,
			602,
			602,
			612,
			611,
			613,
			614,
			609,
			609,
			608,
			613,
			615,
			613,
			608,
			608,
			607,
			615,
			616,
			617,
			618,
			618,
			619,
			616,
			620,
			621,
			622,
			622,
			623,
			620,
			624,
			616,
			619,
			619,
			625,
			624,
			626,
			627,
			621,
			621,
			620,
			626,
			628,
			629,
			616,
			616,
			624,
			628,
			629,
			630,
			617,
			617,
			616,
			629,
			631,
			626,
			620,
			620,
			632,
			631,
			632,
			620,
			623,
			623,
			633,
			632,
			634,
			635,
			630,
			630,
			629,
			634,
			636,
			634,
			629,
			629,
			628,
			636,
			637,
			638,
			639,
			639,
			640,
			637,
			641,
			642,
			643,
			643,
			644,
			641,
			645,
			637,
			640,
			640,
			646,
			645,
			647,
			648,
			642,
			642,
			641,
			647,
			649,
			650,
			637,
			637,
			645,
			649,
			650,
			651,
			638,
			638,
			637,
			650,
			652,
			647,
			641,
			641,
			653,
			652,
			653,
			641,
			644,
			644,
			654,
			653,
			655,
			656,
			651,
			651,
			650,
			655,
			657,
			655,
			650,
			650,
			649,
			657,
			658,
			659,
			660,
			660,
			661,
			658,
			662,
			663,
			664,
			664,
			665,
			662,
			666,
			658,
			661,
			661,
			667,
			666,
			668,
			669,
			663,
			663,
			662,
			668,
			670,
			671,
			658,
			658,
			666,
			670,
			671,
			672,
			659,
			659,
			658,
			671,
			673,
			668,
			662,
			662,
			674,
			673,
			674,
			662,
			665,
			665,
			675,
			674,
			676,
			677,
			672,
			672,
			671,
			676,
			678,
			676,
			671,
			671,
			670,
			678,
			679,
			680,
			681,
			681,
			682,
			679,
			683,
			684,
			685,
			685,
			686,
			683,
			687,
			679,
			682,
			682,
			688,
			687,
			689,
			690,
			684,
			684,
			683,
			689,
			691,
			692,
			679,
			679,
			687,
			691,
			692,
			693,
			680,
			680,
			679,
			692,
			694,
			689,
			683,
			683,
			695,
			694,
			695,
			683,
			686,
			686,
			696,
			695,
			697,
			698,
			693,
			693,
			692,
			697,
			699,
			697,
			692,
			692,
			691,
			699,
			700,
			701,
			702,
			702,
			703,
			700,
			704,
			705,
			706,
			706,
			707,
			704,
			708,
			700,
			703,
			703,
			709,
			708,
			710,
			711,
			705,
			705,
			704,
			710,
			712,
			713,
			700,
			700,
			708,
			712,
			713,
			714,
			701,
			701,
			700,
			713,
			715,
			710,
			704,
			704,
			716,
			715,
			716,
			704,
			707,
			707,
			717,
			716,
			718,
			719,
			714,
			714,
			713,
			718,
			720,
			718,
			713,
			713,
			712,
			720,
			721,
			722,
			723,
			723,
			724,
			721,
			725,
			726,
			727,
			727,
			728,
			725,
			729,
			721,
			724,
			724,
			730,
			729,
			731,
			732,
			726,
			726,
			725,
			731,
			733,
			734,
			721,
			721,
			729,
			733,
			734,
			735,
			722,
			722,
			721,
			734,
			736,
			731,
			725,
			725,
			737,
			736,
			737,
			725,
			728,
			728,
			738,
			737,
			739,
			740,
			735,
			735,
			734,
			739,
			741,
			739,
			734,
			734,
			733,
			741,
			742,
			743,
			744,
			744,
			745,
			742,
			746,
			747,
			743,
			743,
			742,
			746,
			748,
			746,
			742,
			742,
			749,
			748,
			749,
			742,
			745,
			745,
			750,
			749,
			751,
			752,
			753,
			753,
			754,
			751,
			755,
			756,
			757,
			757,
			758,
			755,
			759,
			751,
			754,
			754,
			760,
			759,
			761,
			762,
			756,
			756,
			755,
			761,
			763,
			764,
			751,
			751,
			759,
			763,
			764,
			765,
			752,
			752,
			751,
			764,
			766,
			761,
			755,
			755,
			767,
			766,
			767,
			755,
			758,
			758,
			768,
			767,
			769,
			770,
			765,
			765,
			764,
			769,
			771,
			769,
			764,
			764,
			763,
			771,
			772,
			773,
			774,
			774,
			775,
			772,
			776,
			777,
			778,
			778,
			779,
			776,
			780,
			772,
			775,
			775,
			781,
			780,
			782,
			783,
			777,
			777,
			776,
			782,
			784,
			785,
			772,
			772,
			780,
			784,
			785,
			786,
			773,
			773,
			772,
			785,
			787,
			782,
			776,
			776,
			788,
			787,
			788,
			776,
			779,
			779,
			789,
			788,
			790,
			791,
			786,
			786,
			785,
			790,
			792,
			790,
			785,
			785,
			784,
			792,
			793,
			794,
			795,
			795,
			796,
			793,
			797,
			798,
			799,
			799,
			800,
			797,
			801,
			793,
			796,
			796,
			802,
			801,
			803,
			804,
			798,
			798,
			797,
			803,
			805,
			806,
			793,
			793,
			801,
			805,
			806,
			807,
			794,
			794,
			793,
			806,
			808,
			803,
			797,
			797,
			809,
			808,
			809,
			797,
			800,
			800,
			810,
			809,
			811,
			812,
			813,
			813,
			814,
			811,
			815,
			816,
			817,
			817,
			818,
			815,
			819,
			811,
			814,
			814,
			820,
			819,
			821,
			822,
			816,
			816,
			815,
			821,
			823,
			824,
			811,
			811,
			819,
			823,
			824,
			825,
			812,
			812,
			811,
			824,
			826,
			821,
			815,
			815,
			827,
			826,
			827,
			815,
			818,
			818,
			828,
			827,
			829,
			830,
			831,
			831,
			832,
			829,
			833,
			834,
			835,
			835,
			836,
			833,
			837,
			829,
			832,
			832,
			838,
			837,
			839,
			840,
			834,
			834,
			833,
			839,
			841,
			842,
			829,
			829,
			837,
			841,
			842,
			843,
			830,
			830,
			829,
			842,
			844,
			839,
			833,
			833,
			845,
			844,
			845,
			833,
			836,
			836,
			846,
			845
		]
	};

	class World
	{
		constructor(display)
		{
			this.chunkVicinity = Array(3 ** 3);
			this.chunks        = Array(WORLD_CHUNKS_SIZE);
			this.sun           = new Sun(10, 45);
			this.emptyChunk    = new ChunkDrawable(display);
			this.trees         = [];
			
			if(display) {
				this.getChunkVicinity = this.getChunkVicinity.bind(this);
				this.isSolidBlock     = this.isSolidBlock.bind(this);
				this.getBlockSlope    = this.getBlockSlope.bind(this);
				this.skybox           = new Skybox(display, this.sun);
				this.ground           = new Ground(display, this.sun);
				this.shadowmap        = new ShadowMap(display, this.sun);
				
				this.models = new ModelBatch(
					new Model(display, tree1.data, tree1.indices, "gfx/tree1.png")
				);
			}
			
			this.forEachChunk(({i}) => {
				this.chunks[i] = new ChunkDrawable(display);
			});
		}
		
		getChunk(x, y, z)
		{
			if(
				x >= 0 && y >= 0 && z >= 0 &&
				x < WORLD_CHUNKS_WIDTH && y < WORLD_CHUNKS_WIDTH && z < WORLD_CHUNKS_WIDTH
			) {
				return this.chunks[localChunkIndex(x, y, z)];
			}
			
			return this.emptyChunk;
		}
		
		getChunkVicinity(x, y, z)
		{
			for(let iz = z - 1, i = 0; iz <= z + 1; iz++) {
				for(let iy = y - 1; iy <= y + 1; iy++) {
					for(let ix = x - 1; ix <= x + 1; ix++, i++) {
						this.chunkVicinity[i] = this.getChunk(ix, iy, iz);
					}
				}
			}
			
			return this.chunkVicinity;
		}
		
		getChunkAt(x, y, z)
		{
			return this.getChunk(blockToChunk(x), blockToChunk(y), blockToChunk(z));
		}
		
		getBlock(x, y, z)
		{
			return this.getChunkAt(x, y, z).getBlock(localBlock(x), localBlock(y), localBlock(z));
		}
		
		getBlockId(x, y, z)
		{
			return this.getChunkAt(x, y, z).getBlockId(localBlock(x), localBlock(y), localBlock(z));
		}
		
		getBlockSlope(x, y, z)
		{
			return this.getChunkAt(x, y, z).getBlockSlope(localBlock(x), localBlock(y), localBlock(z));
		}
		
		getBlockInfo(x, y, z)
		{
			return getBlockInfo(this.getBlockId(x, y, z));
		}
		
		isSolidBlock(x, y, z)
		{
			return y <= 0 || isSolidBlock(this.getBlockId(x, y, z));
		}
		
		isVisibleBlock(x, y, z)
		{
			return isVisibleBlock(this.getBlockId(x, y, z));
		}
		
		getBlockTile(x, y, z, fid)
		{
			return getBlockTile(this.getBlockId(x, y, z), fid);
		}
		
		forEachChunk(fn)
		{
			for(let z=0, i=0; z < WORLD_CHUNKS_WIDTH; z++) {
				let oz = z * CHUNK_WIDTH;
				
				for(let y=0; y < WORLD_CHUNKS_WIDTH; y++) {
					let oy = y * CHUNK_WIDTH;
					
					for(let x=0; x < WORLD_CHUNKS_WIDTH; x++, i++) {
						let ox = x * CHUNK_WIDTH;
						
						fn({
							chunk: this.chunks[i],
							i, x, y, z, ox, oy, oz,
						});
					}
				}
			}
		}
		
		forEachBlock(fn)
		{
			this.forEachChunk(({chunk, ox, oy, oz}) => {
				chunk.forEachBlock(({block, i, id, slope, x, y, z}) => {
					fn({
						chunk, block, id, slope,
						x:  ox + x,
						y:  oy + y,
						z:  oz + z,
						lx: x,
						ly: y,
						lz: z,
					});
				});
			});
		}
		
		forEachBlockPos(fn)
		{
			this.forEachChunk(({chunk, ox, oy, oz}) => {
				chunk.forEachBlockPos(({x, y, z, i}) => {
					fn({
						chunk,
						x:  ox + x,
						y:  oy + y,
						z:  oz + z,
						lx: x,
						ly: y,
						lz: z,
					});
				});
			});
		}
		
		setBlock(x, y, z, id = undefined, sl = undefined, addsl = false)
		{
			let chunk = this.getChunkAt(x, y, z);
			
			if(chunk) {
				return chunk.setBlock(localBlock(x), localBlock(y), localBlock(z), id, sl, addsl);
			}
		}
		
		setBlockSlope(x, y, z, sl)
		{
			this.setBlock(x, y, z, undefined, sl);
		}
		
		addBlockSlope(x, y, z, sl)
		{
			this.setBlock(x, y, z, undefined, sl, true);
		}

		boxcast(boxmin, boxmax, vec)
		{
			return boxcast(boxmin, boxmax, vec, this.isSolidBlock, this.getBlockSlope);
		}
		
		deserialize(plain)
		{
			this.trees = plain.trees;
			this.models.update(this.trees);
			
			this.forEachChunk(({chunk, i}) => {
				chunk.deserialize(plain.chunks[i]);
			});
		}
		
		update(delta)
		{
			this.forEachChunk(({chunk, x, y, z}) => {
				chunk.update(this.getChunkVicinity, x, y, z);
			});
			
			this.sun.update(delta);
		}
		
		draw(camera)
		{
			this.shadowmap.beginDraw();
			this.shadowmap.endDraw();
			
			this.skybox.draw(camera);
			this.ground.draw(camera);
			
			this.forEachChunk(({chunk, ox, oy, oz}) => {
				chunk.draw([ox, oy, oz], camera, this.sun.getRayDir());
			});
			
			this.models.draw(camera, this.sun.getSkyDir());
		}
	}

	function noise2d(x, y, s)
	{
		x *= 15485863;  // mult with 1000000. prime
		y *= 285058399; // mult with 15485863. prime
		x += y;
		x *= s || 1;
		x ^= x >> 2;   // xor with r-shift with 1. prime
		x ^= x << 5;   // xor with l-shift with 3. prime
		x ^= x >> 11;  // xor with r-shift with 5. prime
		x ^= x << 17;  // xor with l-shift with 7. prime
		x ^= x >> 23;  // xor with r-shift with 9. prime
		x ^= x << 31;  // xor with l-shift with 11. prime
		
		return (x + 0x80000000) / 0xFFffFFff;
	}

	class NoiseLayer2d
	{
		constructor(scale, amp, seed)
		{
			let width   = WORLD_WIDTH / scale;
			let samples = new Float64Array(width ** 2);
			
			for(let y = 0; y < width; y++) {
				for(let x = 0; x < width; x++) {
					samples[y * width + x] = noise2d(x, y, seed) * amp;
				}
			}
			
			this.width   = width;
			this.samples = samples;
			this.scale   = scale;
			this.div     = 1 / scale;
		}
		
		discreteSample(x, y)
		{
			if(x <= 0 || x >= this.width || y <= 0 || y >= this.width) {
				return 0;
			}
			
			return this.samples[y * this.width + x];
		}
		
		sample(x, y)
		{
			x *= this.div;
			y *= this.div;
			
			let ix = Math.floor(x);
			let iy = Math.floor(y);
			let aa = this.discreteSample(ix,     iy);
			let ba = this.discreteSample(ix + 1, iy);
			let ab = this.discreteSample(ix,     iy + 1);
			let bb = this.discreteSample(ix + 1, iy + 1);
			
			return smoothMix2d(aa, ba, ab, bb, x - ix, y - iy);
		}
	}

	let worker$1   = null;
	let callback = null;
	let world    = null;

	function generateWorld(display, fn)
	{
		world    = new World(display);
		callback = fn;
		
		worker$1.postMessage("start");
		
		return world;
	}

	if(typeof window === "object") {
		worker$1 = new Worker("./bundles/generator.js");
		
		worker$1.onmessage = e => {
			world.deserialize(e.data);
			callback();
		};
	}
	else {
		let heightlayers = [
			new NoiseLayer2d(2,  1,  12345),
			new NoiseLayer2d(16, 16, 23451),
			new NoiseLayer2d(64, 64, 34512),
		];

		let heightmap = new Uint8Array(WORLD_WIDTH ** 2);
		let chunkbuf  = new Uint16Array(CHUNK_SIZE);
		
		onmessage = e => {
			postMessage(generateWorldImpl());
		};

		function generateWorldImpl()
		{
			let world = new World();
			let now   = performance.now();
			let delta = 0;
			
			generateHeightmap();
			
			delta = performance.now() - now;
			console.log("generateHeightmap time:", delta);
			now = performance.now();
			
			generateBaseTerrain(world);
			
			delta = performance.now() - now;
			console.log("generateBaseTerrain time:", delta);
			now = performance.now();
			
			generateSlopes(world);
			
			delta = performance.now() - now;
			console.log("generateSlopes time:", delta);
			now = performance.now();
			
			//generateTrees(world);
			
			return world;
		}

		function generateHeightmap()
		{
			for(let z=0, i=0; z < WORLD_WIDTH; z++) {
				for(let x=0; x < WORLD_WIDTH; x++, i++) {
					heightmap[i] = Math.floor(
						heightlayers.reduce((a,c) => a + c.sample(x, z), 0)
					);
				}
			}
		}

		function getHeight(x, z)
		{
			return heightmap[z * WORLD_WIDTH + x];
		}

		function generateBaseTerrain(world)
		{
			world.forEachChunk(({chunk, ox, oy, oz}) => {
				chunk.forEachBlock(({i, x, y, z}) => {
					let gx = ox + x;
					let gy = oy + y;
					let gz = oz + z;
					let h  = getHeight(gx, gz);
					
					if(gy < h) {
						chunkbuf[i] = 2;
					}
					else if(gy === h) {
						chunkbuf[i] = 3;
					}
					else if(gy === h + 1 && Math.random() < 0.001 * h) {
						chunkbuf[i] = 4;
						world.trees.push(gx);
						world.trees.push(gy);
						world.trees.push(gz);
					}
					else {
						chunkbuf[i] = 0;
					}
				});
				
				chunk.packFrom(chunkbuf);
			});
		}

		function generateSlopes(world)
		{
			world.forEachBlockPos(({x, y, z}) => {
				let h = getHeight(x, z);
				
				if(y - 1 === h
					&& getHeight(x, z + 1) > h
					&& getHeight(x - 1, z) >= h
					&& getHeight(x + 1, z) >= h
				) {
					putSlope(world, x,   y, z, 0b1100);
					putSlope(world, x-1, y, z, 0b1000);
					putSlope(world, x+1, y, z, 0b0100);
				}
				if(y - 1 === h
					&& getHeight(x, z - 1) > h
					&& getHeight(x - 1, z) >= h
					&& getHeight(x + 1, z) >= h
				) {
					putSlope(world, x,   y, z, 0b0011);
					putSlope(world, x-1, y, z, 0b0010);
					putSlope(world, x+1, y, z, 0b0001);
				}
				if(y - 1 === h
					&& getHeight(x + 1, z) > h
					&& getHeight(x, z - 1) >= h
					&& getHeight(x, z + 1) >= h
				) {
					putSlope(world, x, y, z,   0b1010);
					putSlope(world, x, y, z-1, 0b1000);
					putSlope(world, x, y, z+1, 0b0010);
				}
				if(y - 1 === h
					&& getHeight(x - 1, z) > h
					&& getHeight(x, z - 1) >= h
					&& getHeight(x, z + 1) >= h
				) {
					putSlope(world, x, y, z,   0b0101);
					putSlope(world, x, y, z-1, 0b0100);
					putSlope(world, x, y, z+1, 0b0001);
				}
			});
		}

		function putSlope(world, x, y, z, sl)
		{
			if(!world.isSolidBlock(x, y, z) || world.getBlockSlope(x, y, z) > 0) {
				world.setBlock(x, y, z, world.getBlockId(x, y - 1, z), sl, true);
			}
		}
	}

	exports.generateWorld = generateWorld;

	return exports;

}({}));
