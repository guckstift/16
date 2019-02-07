import {ChunkData} from "./ChunkData.js";
import {ChunkMesh} from "./ChunkMesh.js";
import {ChunkDrawable} from "./ChunkDrawable.js";
import {CHUNK_WIDTH} from "./worldmetrics.js";
import * as vector from "../gluck/vector.js";

export class Chunk
{
	constructor(display, x, y, z)
	{
		this.pos      = vector.create(x, y, z);
		this.chunkpos = vector.scale(this.pos, CHUNK_WIDTH);
		this.data     = new ChunkData();
		this.mesh     = new ChunkMesh();
		this.drawable = new ChunkDrawable(display);
		this.dirty    = true;
	}
	
	getBlock(x, y, z)
	{
		return this.data.getBlock(x, y, z);
	}
	
	setBlock(x, y, z, v)
	{
		return this.data.setBlock(x, y, z, v);
	}
	
	packData(buf)
	{
		this.data.pack(buf);
	}
	
	update(world)
	{
		if(this.dirty) {
			this.mesh.update(world.getChunkVicinity(...this.pos));
			this.drawable.update(this.mesh);
			this.dirty = false;
		}
	}
	
	draw(camera, sun)
	{
		this.drawable.draw(this.chunkpos, camera, sun);
	}
}
