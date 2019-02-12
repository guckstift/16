import {VertexLayout} from "../gluck/VertexLayout.js";
import * as vector from "../gluck/vector.js";
import {isSolidBlock, getBlockTile, isVisibleBlock, getBlockSlope} from "./blocks.js";
import {CHUNK_WIDTH, CHUNK_SIZE, localBlockIndex} from "./worldmetrics.js";

export class ChunkMesh
{
	constructor()
	{
		this.data    = new Uint8Array(0);
		this.vertnum = 0;
	}
	
	getData()
	{
		return this.data;
	}
	
	getVertNum()
	{
		return this.vertnum;
	}
	
	update(chunkDataMatrix)
	{
		if(!Array.isArray(chunkDataMatrix) || chunkDataMatrix.length < 27) {
			singleChunkDataMatrix[13] = chunkDataMatrix;
			chunkDataMatrix           = singleChunkDataMatrix;
		}
		
		let chunkData = chunkDataMatrix[13];
		
		if(!chunkData || chunkData.isUniform() && !isVisibleBlock(chunkData.getUniform())) {
			this.data    = new Uint8Array(0);
			this.vertnum = 0;
		}
		else {
			this.data    = createMesh(chunkDataMatrix);
			this.vertnum = meshVertCount;
		}
	}
}

export let VERT_SIZE = 3 + 1 + 3 + 1;
export let QUAD_SIZE = 2 * 3 * VERT_SIZE;

export let vertLayout = new VertexLayout(
	"ubyte",
	["vert", 3], ["occl", 1], ["normal", 3], ["tile", 1]
);

let singleChunkDataMatrix = [
	null, null, null,
	null, null, null,
	null, null, null,

	null, null, null,
	null, null, null,
	null, null, null,

	null, null, null,
	null, null, null,
	null, null, null,
];

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

function getDataCache(x, y, z)
{
	return dataCacheMatrix[x + 1 + 3 * (y + 1) + 9 * (z + 1)];
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

function unpackChunkData(chunkDataMatrix)
{
	for(let i = 0; i < 27; i++) {
		let chunkData = chunkDataMatrix[i];
		
		if(chunkData) {
			chunkData.unpack(dataCacheMatrix[i]);
		}
		else {
			dataCacheMatrix[i].fill(0);
		}
	}
}

function computeFaces()
{
	let dataCache = getDataCache(0, 0, 0);
	
	for(let z = 0, i = 0; z < CHUNK_WIDTH; z++) {
		for(let y = 0; y < CHUNK_WIDTH; y++) {
			for(let x = 0; x < CHUNK_WIDTH; x++, i++) {
				let block = dataCache[i];
				
				if(isSolidBlock(block)) {
					if(getBlockSlope(block) > 0) {
						//computeFace(x, y, z,  +1, 0, 0, block, 0, rightFaces);
						//computeFace(x, y, z,  -1, 0, 0, block, 1, leftFaces);
						//computeSlope(x, y, z, block);
						//computeFace(x, y, z,   0,-1, 0, block, 3, bottomFaces);
						//computeFace(x, y, z,   0, 0,+1, block, 4, backFaces);
						//computeFace(x, y, z,   0, 0,-1, block, 5, frontFaces);
					}
					else {
						computeFace(x, y, z, +1, 0, 0, block, 0, rightFaces);
						computeFace(x, y, z, -1, 0, 0, block, 1, leftFaces);
						computeFace(x, y, z,  0,+1, 0, block, 2, topFaces);
						computeFace(x, y, z,  0,-1, 0, block, 3, bottomFaces);
						computeFace(x, y, z,  0, 0,+1, block, 4, backFaces);
						computeFace(x, y, z,  0, 0,-1, block, 5, frontFaces);
					}
				}
				else {
					rightFaces[i]  = 0;
					leftFaces[i]   = 0;
					topFaces[i]    = 0;
					bottomFaces[i] = 0;
					backFaces[i]   = 0;
					frontFaces[i]  = 0;
				}
			}
		}
	}
}

function computeSlope(x, y, z, block)
{
	let tile  = getBlockTile(block, 2);
	let slope = getBlockSlope(block);
	
	topFaces[localBlockIndex(x, y, z)] = (
		createFaceInfo(tile, 0, 0, 0, 0, slope, 1)
	);
}

function computeFace(x, y, z, nx, ny, nz, block, fid, targetFaces)
{
	let right   = false;
	let left    = false;
	let top     = false;
	let bottom  = false;
	let rtc     = false;
	let ltc     = false;
	let rbc     = false;
	let lbc     = false;
	let tile    = 0;
	let visible = 0;
	let occl0   = 0;
	let occl1   = 0;
	let occl2   = 0;
	let occl3   = 0;
	
	if(!isSolidBlock(getCachedBlock(x + nx, y + ny, z + nz))) {
		tile    = getBlockTile(block, fid);
		visible = 1;
		
		if(nx > 0) {
			right  = isSolidBlock(getCachedBlock(x + 1, y,     z + 1));
			left   = isSolidBlock(getCachedBlock(x + 1, y,     z - 1));
			top    = isSolidBlock(getCachedBlock(x + 1, y + 1, z));
			bottom = isSolidBlock(getCachedBlock(x + 1, y - 1, z));
			rtc    = isSolidBlock(getCachedBlock(x + 1, y + 1, z + 1));
			ltc    = isSolidBlock(getCachedBlock(x + 1, y + 1, z - 1));
			rbc    = isSolidBlock(getCachedBlock(x + 1, y - 1, z + 1));
			lbc    = isSolidBlock(getCachedBlock(x + 1, y - 1, z - 1));
		}
		else if(nx < 0) {
			right  = isSolidBlock(getCachedBlock(x - 1, y,     z - 1));
			left   = isSolidBlock(getCachedBlock(x - 1, y,     z + 1));
			top    = isSolidBlock(getCachedBlock(x - 1, y + 1, z));
			bottom = isSolidBlock(getCachedBlock(x - 1, y - 1, z));
			rtc    = isSolidBlock(getCachedBlock(x - 1, y + 1, z - 1));
			ltc    = isSolidBlock(getCachedBlock(x - 1, y + 1, z + 1));
			rbc    = isSolidBlock(getCachedBlock(x - 1, y - 1, z - 1));
			lbc    = isSolidBlock(getCachedBlock(x - 1, y - 1, z + 1));
		}
		else if(ny > 0) {
			right  = isSolidBlock(getCachedBlock(x + 1, y + 1, z));
			left   = isSolidBlock(getCachedBlock(x - 1, y + 1, z));
			top    = isSolidBlock(getCachedBlock(x,     y + 1, z + 1));
			bottom = isSolidBlock(getCachedBlock(x,     y + 1, z - 1));
			rtc    = isSolidBlock(getCachedBlock(x + 1, y + 1, z + 1));
			ltc    = isSolidBlock(getCachedBlock(x - 1, y + 1, z + 1));
			rbc    = isSolidBlock(getCachedBlock(x + 1, y + 1, z - 1));
			lbc    = isSolidBlock(getCachedBlock(x - 1, y + 1, z - 1));
		}
		else if(ny < 0) {
			right  = isSolidBlock(getCachedBlock(x + 1, y - 1, z));
			left   = isSolidBlock(getCachedBlock(x - 1, y - 1, z));
			top    = isSolidBlock(getCachedBlock(x,     y - 1, z - 1));
			bottom = isSolidBlock(getCachedBlock(x,     y - 1, z + 1));
			rtc    = isSolidBlock(getCachedBlock(x + 1, y - 1, z - 1));
			ltc    = isSolidBlock(getCachedBlock(x - 1, y - 1, z - 1));
			rbc    = isSolidBlock(getCachedBlock(x + 1, y - 1, z + 1));
			lbc    = isSolidBlock(getCachedBlock(x - 1, y - 1, z + 1));
		}
		else if(nz > 0) {
			right  = isSolidBlock(getCachedBlock(x - 1, y,     z + 1));
			left   = isSolidBlock(getCachedBlock(x + 1, y,     z + 1));
			top    = isSolidBlock(getCachedBlock(x,     y + 1, z + 1));
			bottom = isSolidBlock(getCachedBlock(x,     y - 1, z + 1));
			rtc    = isSolidBlock(getCachedBlock(x - 1, y + 1, z + 1));
			ltc    = isSolidBlock(getCachedBlock(x + 1, y + 1, z + 1));
			rbc    = isSolidBlock(getCachedBlock(x - 1, y - 1, z + 1));
			lbc    = isSolidBlock(getCachedBlock(x + 1, y - 1, z + 1));
		}
		else if(nz < 0) {
			right  = isSolidBlock(getCachedBlock(x + 1, y,     z - 1));
			left   = isSolidBlock(getCachedBlock(x - 1, y,     z - 1));
			top    = isSolidBlock(getCachedBlock(x,     y + 1, z - 1));
			bottom = isSolidBlock(getCachedBlock(x,     y - 1, z - 1));
			rtc    = isSolidBlock(getCachedBlock(x + 1, y + 1, z - 1));
			ltc    = isSolidBlock(getCachedBlock(x - 1, y + 1, z - 1));
			rbc    = isSolidBlock(getCachedBlock(x + 1, y - 1, z - 1));
			lbc    = isSolidBlock(getCachedBlock(x - 1, y - 1, z - 1));
		}
		
		occl0 = getVertOcclusion(left,  bottom, lbc);
		occl1 = getVertOcclusion(right, bottom, rbc);
		occl2 = getVertOcclusion(left,  top,    ltc);
		occl3 = getVertOcclusion(right, top,    rtc);
	}
	
	targetFaces[localBlockIndex(x, y, z)] = (
		createFaceInfo(tile, occl0, occl1, occl2, occl3, 0, visible)
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
						addSlopeQuad(j, q, info.tile, slope, flip);
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

function addSlopeQuad(p, q, tile, slope, flip)
{
	let i = meshVertCount * VERT_SIZE;
	let s = i;
	let nx = 128;
	let ny = 128;
	let nz = 128;
	let oc0 = 0;
	let oc1 = 0;
	let oc2 = 0;
	let oc3 = 0;
	let slope00 = slope >> 0 & 1;
	let slope10 = slope >> 1 & 1;
	let slope01 = slope >> 2 & 1;
	let slope11 = slope >> 3 & 1;
	
	r.set(p);
	r[1] -= 1 - slope00;
	meshVerts.set(r, i);
	meshVerts[i + 3] = oc0;
	meshVerts[i + 4] = nx;
	meshVerts[i + 5] = ny + 1;
	meshVerts[i + 6] = nz;
	meshVerts[i + 7] = tile;
	
	i += VERT_SIZE;
	r.set(p);
	r[0] = q[0];
	r[1] -= 1 - slope10;
	meshVerts.set(r, i);
	meshVerts[i + 3] = oc1;
	meshVerts[i + 4] = nx;
	meshVerts[i + 5] = ny + 1;
	meshVerts[i + 6] = nz;
	meshVerts[i + 7] = tile;
	
	i += VERT_SIZE;
	r.set(p);
	r[1] -= 1 - slope01;
	r[2] = q[2];
	meshVerts.set(r, i);
	meshVerts[i + 3] = oc2;
	meshVerts[i + 4] = nx;
	meshVerts[i + 5] = ny + 1;
	meshVerts[i + 6] = nz;
	meshVerts[i + 7] = tile;
	
	i += VERT_SIZE;
	arrayCopyInside(meshVerts, i, i - VERT_SIZE * 1, VERT_SIZE);
	
	i += VERT_SIZE;
	arrayCopyInside(meshVerts, i, i - VERT_SIZE * 3, VERT_SIZE);
	
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
	
	nx += 128;
	ny += 128;
	nz += 128;
	
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
