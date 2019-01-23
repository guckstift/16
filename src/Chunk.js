import {ChunkData} from "./ChunkData.js";
import {ChunkMesh} from "./ChunkMesh.js";
import {ChunkDrawable} from "./ChunkDrawable.js";
import * as vector from "./vector.js";

export class Chunk
{
	constructor(display, x, y, z)
	{
		this.pos      = vector.create(x, y, z);
		this.data     = new ChunkData();
		this.mesh     = new ChunkMesh();
		this.drawable = new ChunkDrawable(display);
		this.dirty    = true;
	}
	
	getBlock(x, y, z)
	{
		return this.data.getBlock(x, y, z);
	}
	
	setBlock(x, y, z, b)
	{
		return this.data.setBlock(x, y, z, v);
	}
	
	update()
	{
		if(this.dirty) {
			this.mesh.update(this.data);
			this.drawable.update(this.mesh);
			this.dirty = false;
		}
	}
	
	draw(camera, sun)
	{
		this.drawable.draw(this.pos, camera, sun);
	}
}
