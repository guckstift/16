import {Chunk} from "./Chunk.js";
import {Generator} from "./Generator.js";
import {WORLD_CHUNKS_WIDTH, CHUNK_WIDTH, localChunkIndex} from "./worldmetrics.js";
import * as vector from "./vector.js";

export class World
{
	constructor(display)
	{
		this.generator = new Generator();
		this.sun       = vector.create(0, -1, 0);
		this.chunks    = [];
		
		for(let z=0; z < WORLD_CHUNKS_WIDTH; z++) {
			for(let y=0; y < WORLD_CHUNKS_WIDTH; y++) {
				for(let x=0; x < WORLD_CHUNKS_WIDTH; x++) {
					this.chunks.push(new Chunk(display, x, y, z));
					
					for(let bz=0; bz < CHUNK_WIDTH; bz++) {
						for(let by=0; by < CHUNK_WIDTH; by++) {
							for(let bx=0; bx < CHUNK_WIDTH; bx++) {
								let gx = x * CHUNK_WIDTH + bx;
								let gy = y * CHUNK_WIDTH + by;
								let gz = z * CHUNK_WIDTH + bz;
								let h  = this.generator.sample(gx, gy, gz);
								
								if(gy < h) {
									this.setBlock(gx, gy, gz, 1);
								}
							}
						}
					}
				}
			}
		}
	}
	
	getChunk(x, y, z)
	{
		return this.chunks[localChunkIndex(x, y, z)]
	}
	
	getBlock(x, y, z)
	{
		let chunk = this.getChunk(
			blockToChunk(x),
			blockToChunk(y),
			blockToChunk(z),
		);
		
		return chunk.getBlock(
			localBlock(x),
			localBlock(y),
			localBlock(z),
		);
	}
	
	update()
	{
		this.chunks.forEach(chunk => chunk.update());
	}
	
	draw(camera)
	{
		this.chunks.forEach(chunk => chunk.draw(camera, this.sun));
	}
}
