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
	WORLD_CHUNKS_COUNT, WORLD_CHUNKS_W, CHUNK_WIDTH, localChunkIndex, blockToChunk, localBlock
} from "./worldmetrics.js";

export class World
{
	constructor(display)
	{
		this.chunkVicinity = Array(3 ** 2);
		this.chunks        = Array(WORLD_CHUNKS_COUNT);
		this.sun           = new Sun(0.375, 0);
		this.emptyChunk    = new ChunkDrawable(display);
		this.trees         = [];
		this.framecnt      = 0;
				
		if(display) {
			this.getChunkVicinity = this.getChunkVicinity.bind(this);
			this.isSolidBlock     = this.isSolidBlock.bind(this);
			this.getBlockSlope    = this.getBlockSlope.bind(this);
			this.skybox           = new Skybox(display, this.sun);
			this.ground           = new Ground(display, this.sun);
			this.shadowmapTotal   = new ShadowMap(display, this.sun, 444);
			this.shadowmapDetail  = new ShadowMap(display, this.sun, 16);
			
			this.shadowmapTotal.camera.setPos([128, 128, 128]);
			
			this.models = new ModelBatch(
				new Model(display, tree1.data, tree1.indices, "gfx/tree1.png")
			);
		}
		
		this.forEachChunk(({i}) => {
			this.chunks[i] = new ChunkDrawable(display);
		});
	}
	
	getChunk(x, z)
	{
		if(x >= 0 && z >= 0 && x < WORLD_CHUNKS_W && z < WORLD_CHUNKS_W) {
			return this.chunks[localChunkIndex(x, z)];
		}
		
		return this.emptyChunk;
	}
	
	getChunkVicinity(x, z)
	{
		for(let iz = z - 1, i = 0; iz <= z + 1; iz++) {
			for(let ix = x - 1; ix <= x + 1; ix++, i++) {
				this.chunkVicinity[i] = this.getChunk(ix, iz);
			}
		}
		
		return this.chunkVicinity;
	}
	
	getChunkAt(x, z)
	{
		return this.getChunk(blockToChunk(x), blockToChunk(z));
	}
	
	getBlock(x, y, z)
	{
		return this.getChunkAt(x, z).getBlock(localBlock(x), y, localBlock(z));
	}
	
	getBlockId(x, y, z)
	{
		return this.getChunkAt(x, z).getBlockId(localBlock(x), y, localBlock(z));
	}
	
	getBlockSlope(x, y, z)
	{
		return this.getChunkAt(x, z).getBlockSlope(localBlock(x), y, localBlock(z));
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
		for(let z=0, i=0; z < WORLD_CHUNKS_W; z++) {
			let oz = z * CHUNK_WIDTH;
		
			for(let x=0; x < WORLD_CHUNKS_W; x++, i++) {
				let ox = x * CHUNK_WIDTH;
				
				fn({
					chunk: this.chunks[i],
					i, x, z, ox, oz,
				});
			}
		}
	}
	
	forEachBlock(fn)
	{
		this.forEachChunk(({chunk, ox, oz}) => {
			chunk.forEachBlock(({block, i, id, slope, x, y, z}) => {
				fn({
					chunk, block, id, slope, y,
					x:  ox + x,
					z:  oz + z,
					lx: x,
					lz: z,
				});
			});
		});
	}
	
	forEachBlockPos(fn)
	{
		this.forEachChunk(({chunk, ox, oz}) => {
			chunk.forEachBlockPos(({x, y, z, i}) => {
				fn({
					chunk, y,
					x:  ox + x,
					z:  oz + z,
					lx: x,
					lz: z,
				});
			});
		});
	}
	
	setBlock(x, y, z, id = undefined, sl = undefined, addsl = false)
	{
		this.getChunkAt(x, z).setBlock(localBlock(x), y, localBlock(z), id, sl, addsl);
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
		this.forEachChunk(({chunk, x, z}) => {
			chunk.update(this.getChunkVicinity, x, z);
		});
		
		this.sun.update(delta);
	}
	
	draw(camera)
	{
		if(this.framecnt % 16 === 0) {
			this.shadowmapTotal.beginDraw();
			this.drawWorld(this.shadowmapTotal.camera, true);
			this.shadowmapTotal.endDraw();
		}
		
		if(this.framecnt % 8 === 0) {
			this.shadowmapDetail.camera.setPos(camera.pos);
			this.shadowmapDetail.beginDraw();
			this.drawWorld(this.shadowmapDetail.camera, true);
			this.shadowmapDetail.endDraw();
		}
		
		this.drawWorld(camera);
		
		this.framecnt++;
	}
	
	drawWorld(camera, depthOnly = false)
	{
		if(!depthOnly) {
			this.skybox.draw(camera);
		}
		
		this.ground.draw(camera);
		
		if(depthOnly) {
			this.forEachChunk(({chunk, ox, oz}) => {
				chunk.drawDepth([ox, 0, oz], camera);
			});
		}
		else {
			this.forEachChunk(({chunk, ox, oz}) => {
				chunk.draw(
					[ox, 0, oz],
					camera,
					this.sun.getRayDir(),
					this.shadowmapTotal,
					this.shadowmapDetail,
				);
			});
		}
		
		this.models.draw(camera, this.sun.getSkyDir(), depthOnly);
	}
}
