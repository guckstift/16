import {Chunk} from "./Chunk.js";
import {Generator} from "./Generator.js";
import {WORLD_CHUNKS_WIDTH, CHUNK_WIDTH, localChunkIndex, blockToChunk, localBlock} from "./worldmetrics.js";
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
					let chunk = new Chunk(display, x, y, z);
					let buf   = this.generator.genChunk(x, y, z);
					
					chunk.packData(buf);
					this.chunks.push(chunk);
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
	
	setBlock(x, y, z, v)
	{
		let chunk = this.getChunk(
			blockToChunk(x),
			blockToChunk(y),
			blockToChunk(z),
		);
		
		return chunk.setBlock(
			localBlock(x),
			localBlock(y),
			localBlock(z),
			v,
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
