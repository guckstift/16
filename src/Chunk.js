import {ChunkData} from "./ChunkData.js";
import {ChunkMesh} from "./ChunkMesh.js";
import {ChunkDrawable} from "./ChunkDrawable.js";
import {CHUNK_WIDTH} from "./worldmetrics.js";
import * as vector from "../gluck/vector.js";

export class Chunk extends ChunkData
{
	constructor(display)
	{
		super();
		
		this.mesh     = new ChunkMesh();
		this.drawable = new ChunkDrawable(display);
	}
	
	update(chunkVicinity)
	{
		if(this.isModified()) {
			super.update();
			this.mesh.update(chunkVicinity);
			this.drawable.update(this.mesh);
		}
	}
	
	draw(pos, camera, sun)
	{
		this.drawable.draw(pos, camera, sun);
	}
}
