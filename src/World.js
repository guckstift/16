import {ChunkDrawable} from "./ChunkDrawable.js";
import {boxcast} from "./boxcast.js";
import {getBlockInfo, isSolidBlock, isVisibleBlock, getBlockTile} from "./blocks.js";
import {Sun} from "./Sun.js";
import {Skybox} from "./Skybox.js";
import {Ground} from "./Ground.js";
import {ShadowMap} from "./ShadowMap.js";
import {Model} from "./Model.js";
import {ModelBatch} from "./ModelBatch.js";
import {tree1} from "../models/tree1.js";

import {
	WORLD_CHUNKS_WIDTH, WORLD_CHUNKS_SIZE, CHUNK_WIDTH, localChunkIndex, blockToChunk, localBlock
} from "./worldmetrics.js";

export class World
{
	constructor(display)
	{
		this.chunkVicinity = Array(3 ** 3);
		this.chunks        = Array(WORLD_CHUNKS_SIZE);
		this.sun           = new Sun(1, 0);
		this.emptyChunk    = new ChunkDrawable(display);
		this.trees         = [];
				
		if(display) {
			this.getChunkVicinity = this.getChunkVicinity.bind(this);
			this.isSolidBlock     = this.isSolidBlock.bind(this);
			this.getBlockSlope    = this.getBlockSlope.bind(this);
			this.skybox           = new Skybox(display, this.sun);
			this.ground           = new Ground(display, this.sun);
			this.shadowmapTotal   = new ShadowMap(display, this.sun, 444);
			this.shadowmapDetail  = new ShadowMap(display, this.sun, 16);
			
			this.shadowmapTotal.camera.setPos([128, 128, 128]);
			
			this.quad = new Model(display, [
				0,0,0,  0,0,-1,  0,0,
				1,0,0,  0,0,-1,  1,0,
				0,1,0,  0,0,-1,  0,1,
				1,1,0,  0,0,-1,  1,1,
			], [0,1,2, 2,1,3], this.shadowmapDetail.colortex);
			
			this.models = new ModelBatch(
				new Model(display, tree1.data, tree1.indices, "gfx/tree1.png")
			);
		}
		
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
	
	deserialize(plain)
	{
		this.trees = plain.trees;
		this.models.update(this.trees);
		
		this.forEachChunk(({chunk, i}) => {
			chunk.deserialize(plain.chunks[i]);
		});
	}
	
	update(delta)
	{
		this.forEachChunk(({chunk, x, y, z}) => {
			chunk.update(this.getChunkVicinity, x, y, z);
		});
		
		this.sun.update(delta);
	}
	
	draw(camera)
	{
		this.shadowmapTotal.beginDraw();
		this.drawWorld(this.shadowmapTotal.camera);
		this.shadowmapTotal.endDraw();
		
		this.shadowmapDetail.camera.setPos(camera.pos);
		this.shadowmapDetail.beginDraw();
		this.drawWorld(this.shadowmapDetail.camera);
		this.shadowmapDetail.endDraw();
		
		this.drawWorld(camera);
		//this.quad.draw([0,1,0], camera, this.sun.getSkyDir());
	}
	
	drawWorld(camera)
	{
		this.skybox.draw(camera);
		this.ground.draw(camera);
		
		this.forEachChunk(({chunk, ox, oy, oz}) => {
			chunk.draw(
				[ox, oy, oz],
				camera,
				this.sun.getRayDir(),
				this.shadowmapTotal,
				this.shadowmapDetail,
			);
		});
		
		this.models.draw(camera, this.sun.getSkyDir());
	}
}
