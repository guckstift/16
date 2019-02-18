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
		
		update(chunkVicinity, fn)
		{
			if(super.update()) {
				if(this.isUniform() && !isVisibleBlock(this.getUniform())) {
					this.verts   = new Uint8Array(0);
					this.vertnum = 0;
				}
				else {
					createMesh(chunkVicinity, (verts, vertnum) => {
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
		
		update(chunkVicinity)
		{
			super.update(chunkVicinity, () => {
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

	class World
	{
		constructor(display)
		{
			this.chunkVicinity = Array(3 ** 3);
			this.chunks        = Array(WORLD_CHUNKS_SIZE);
			this.sun           = new Sun(10, 45);
			this.emptyChunk    = new ChunkDrawable(display);
			
			if(display) {
				this.isSolidBlock  = this.isSolidBlock.bind(this);
				this.getBlockSlope = this.getBlockSlope.bind(this);
				this.skybox        = new Skybox(display, this.sun);
				this.ground        = new Ground(display, this.sun);
				this.shadowmap     = new ShadowMap(display, this.sun);
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
		
		update(delta)
		{
			this.forEachChunk(({chunk, x, y, z}) => {
				chunk.update(this.getChunkVicinity(x, y, z));
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

	function generateWorld(fn)
	{
		callback = fn;
		
		worker$1.postMessage("start");
	}

	if(typeof window === "object") {
		worker$1 = new Worker("./bundles/generator.js");
		
		worker$1.onmessage = e => {
			callback(e.data);
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
			
			generateHeightmap();
			generateBaseTerrain(world);
			generateSlopes(world);
			
			return world;
		}

		function generateHeightmap()
		{
			for(let z=0, i=0; z < WORLD_WIDTH; z++) {
				for(let x=0; x < WORLD_WIDTH; x++, i++) {
					heightmap[i] = Math.floor(heightlayers.reduce((a,c) => a + c.sample(x, z), 0));
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
