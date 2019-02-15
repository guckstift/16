import {ChunkData} from "./ChunkData.js";
import {VertexLayout} from "../gluck/VertexLayout.js";
import * as vector from "../gluck/vector.js";
import {isSolidBlock, getBlockTile, isVisibleBlock} from "./blocks.js";
import {CHUNK_WIDTH, CHUNK_SIZE, localBlockIndex} from "./worldmetrics.js";

export class ChunkMesh extends ChunkData
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
	
	update(chunkVicinity)
	{
		if(super.update()) {
			if(this.isUniform() && !isVisibleBlock(this.getUniform())) {
				this.verts   = new Uint8Array(0);
				this.vertnum = 0;
			}
			else {
				this.verts   = createMesh(chunkVicinity);
				this.vertnum = getLastVertNum();
			}
			
			return true;
		}
		
		return false;
	}
}

export let CHUNK_VERT_LAYOUT = new VertexLayout(
	"ubyte", ["vert", 3], ["occl", 1], ["normal", 3], ["tile", 1]
);

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
