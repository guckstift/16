import {Chunk} from "./Chunk.js";
import {Generator} from "./Generator.js";
import {boxcast} from "./boxcast.js";
import {isSolidBlock, getBlockSlope} from "./blocks.js";
import {
	WORLD_CHUNKS_WIDTH, WORLD_CHUNKS_SIZE, CHUNK_WIDTH, localChunkIndex, blockToChunk, localBlock
} from "./worldmetrics.js";
import * as vector from "../gluck/vector.js";
import {radians} from "../gluck/math.js";

export class World
{
	constructor(display)
	{
		this.solidBlock    = this.solidBlock.bind(this);
		this.getBlockSlope = this.getBlockSlope.bind(this);
		
		this.generator = new Generator();
		this.sun       = vector.create(0, -1, 0);
		this.chunks    = Array.from(Array(WORLD_CHUNKS_SIZE));
		
		vector.rotateX(this.sun, radians(-30), this.sun);
		vector.rotateY(this.sun, radians(-30), this.sun);
		
		for(let z=0; z < WORLD_CHUNKS_WIDTH; z++) {
			for(let y=0; y < WORLD_CHUNKS_WIDTH; y++) {
				for(let x=0; x < WORLD_CHUNKS_WIDTH; x++) {
					this.chunks[localChunkIndex(x, y, z)] = new Chunk(display, x, y, z);
				}
			}
		}
		
		this.generator.buildWorld(this);
	}
	
	getChunk(x, y, z)
	{
		if(
			x >= 0 && y >= 0 && z >= 0
			&& x < WORLD_CHUNKS_WIDTH && y < WORLD_CHUNKS_WIDTH && z < WORLD_CHUNKS_WIDTH
		) {
			return this.chunks[localChunkIndex(x, y, z)]
		}
		
		return null;
	}
	
	getChunkVicinity(x, y, z)
	{
		for(let iz = z-1, i=0; iz <= z+1; iz++) {
			for(let iy = y-1; iy <= y+1; iy++) {
				for(let ix = x-1; ix <= x+1; ix++, i++) {
					let chunk = this.getChunk(ix, iy, iz);
					
					chunkVicinity[i] = chunk ? chunk.data : null;
				}
			}
		}
		
		return chunkVicinity;
	}
	
	getBlock(x, y, z)
	{
		let chunk = this.getChunk(
			blockToChunk(x),
			blockToChunk(y),
			blockToChunk(z),
		);
		
		if(chunk) {
			return chunk.getBlock(
				localBlock(x),
				localBlock(y),
				localBlock(z),
			);
		}
		
		return 0;
	}

	solidBlock(x, y, z)
	{
		return y <= 0 || isSolidBlock(this.getBlock(x, y, z));
	}
	
	getBlockSlope(x, y, z)
	{
		return getBlockSlope(this.getBlock(x, y, z));
	}
	
	setBlockSlope(x, y, z, s)
	{
		return this.setBlock(x, y, z, this.getBlock(x, y, z) & 0xff, s);
	}
	
	setBlock(x, y, z, v, s = 0)
	{
		let chunk = this.getChunk(
			blockToChunk(x),
			blockToChunk(y),
			blockToChunk(z),
		);
		
		if(chunk) {
			chunk.setBlock(
				localBlock(x),
				localBlock(y),
				localBlock(z),
				v, s,
			);
		}
	}

	boxcast(boxmin, boxmax, vec)
	{
		return boxcast(boxmin, boxmax, vec, this.solidBlock, this.getBlockSlope);
	}
	
	update()
	{
		this.chunks.forEach(chunk => {
			if(chunk) {
				chunk.update(this);
			}
		});
		
		vector.rotateZ(this.sun, 1/1024, this.sun);
	}
	
	draw(camera)
	{
		this.chunks.forEach(chunk => {
			if(chunk) {
				chunk.draw(camera, this.sun);
			}
		});
	}
}

let chunkVicinity = [
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
