import {ChunkData} from "./ChunkData.js";
import {VertexLayout} from "../gluck/VertexLayout.js";
import * as vector from "../gluck/vector.js";
import {isSolidBlock, getBlockTile, isVisibleBlock} from "./blocks.js";
import {CHUNK_SIZE} from "./worldmetrics.js";

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
	
	update(getChunkVicinity, x, z, fn)
	{
		if(super.update()) {
			if(this.isUniform() && !isVisibleBlock(this.getUniform())) {
				this.verts   = new Uint8Array(0);
				this.vertnum = 0;
			}
			else {
				createMesh(getChunkVicinity(x, z), (verts, vertnum) => {
					this.verts   = verts;
					this.vertnum = vertnum;
					fn();
				});
			}
		}
	}
}

export let CHUNK_VERT_LAYOUT = new VertexLayout(
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
	worker.postMessage({dcm: dataCacheMatrix, cbId: cbId});
}

function unpackChunkData(chunkVicinity)
{
	chunkVicinity.forEach((chunk, i) => {
		chunk.unpackTo(dataCacheMatrix[i]);
	});
}
