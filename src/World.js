import {ChunkDrawable} from "./ChunkDrawable.js";
import {boxcast} from "./boxcast.js";
import {getBlockInfo, isSolidBlock, isVisibleBlock, getBlockTile} from "./blocks.js";
import {Sun} from "./Sun.js";
import {Skybox} from "./Skybox.js";
import {Ground} from "./Ground.js";
import {ShadowMap} from "./ShadowMap.js";

import {
	WORLD_CHUNKS_WIDTH, WORLD_CHUNKS_SIZE, CHUNK_WIDTH, localChunkIndex, blockToChunk, localBlock
} from "./worldmetrics.js";

export class World
{
	constructor(display)
	{
		this.isSolidBlock  = this.isSolidBlock.bind(this);
		this.getBlockSlope = this.getBlockSlope.bind(this);
		
		this.chunkVicinity = Array(3 ** 3);
		this.chunks        = Array(WORLD_CHUNKS_SIZE);
		this.emptyChunk    = new ChunkDrawable(display);
		this.sun           = new Sun(10, 45);
		this.skybox        = new Skybox(display, this.sun);
		this.ground        = new Ground(display, this.sun);
		this.shadowmap     = new ShadowMap(display, this.sun);
		
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
