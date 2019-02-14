import {NoiseLayer2d} from "./NoiseLayer2d.js";
import {
	CHUNK_SIZE, CHUNK_WIDTH, WORLD_WIDTH, WORLD_CHUNKS_WIDTH,
	localBlockIndex, localBlockX, localBlockY, localBlockZ,	globalBlockIndex
} from "./worldmetrics.js";

export class Generator
{
	constructor()
	{
		this.heightlayers = [
			new NoiseLayer2d(2,  1,  12345),
			new NoiseLayer2d(16, 16, 23451),
			new NoiseLayer2d(64, 64, 34512),
		];
		
		this.heightmap = new Uint8Array(WORLD_WIDTH ** 2);
		this.chunkbuf  = new Uint16Array(CHUNK_SIZE);
	}
	
	getHeight(x, z)
	{
		return this.heightmap[z * WORLD_WIDTH + x];
	}
	
	buildWorld(world)
	{
		for(let z=0, i=0; z < WORLD_WIDTH; z++) {
			for(let x=0; x < WORLD_WIDTH; x++, i++) {
				this.heightmap[i] = Math.floor(
					this.heightlayers.reduce((a,c) => a + c.sample(x, z), 0)
				);
			}
		}
		
		for(let cz=0; cz < WORLD_CHUNKS_WIDTH; cz++) {
			let oz = cz * CHUNK_WIDTH;
			
			for(let cy=0; cy < WORLD_CHUNKS_WIDTH; cy++) {
				let oy = cy * CHUNK_WIDTH;
		
				for(let cx=0; cx < WORLD_CHUNKS_WIDTH; cx++) {
					let ox = cx * CHUNK_WIDTH;
					
					for(let lz=0, i=0; lz < CHUNK_WIDTH; lz++) {
						let z = oz + lz;
						
						for(let ly=0; ly < CHUNK_WIDTH; ly++) {
							let y = oy + ly;
							
							for(let lx=0; lx < CHUNK_WIDTH; lx++, i++) {
								let x = ox + lx;
								let h = this.getHeight(x, z);
								
								if(y < h) {
									this.chunkbuf[i] = 2;
								}
								else if(y === h) {
									this.chunkbuf[i] = 3;
								}
								else {
									this.chunkbuf[i] = 0;
								}
							}
						}
					}
					
					world.getChunk(cx, cy, cz).packFrom(this.chunkbuf);
				}
			}
		}
		
		for(let cz=0; cz < WORLD_CHUNKS_WIDTH; cz++) {
			let oz = cz * CHUNK_WIDTH;
			
			for(let cy=0; cy < WORLD_CHUNKS_WIDTH; cy++) {
				let oy = cy * CHUNK_WIDTH;
		
				for(let cx=0; cx < WORLD_CHUNKS_WIDTH; cx++) {
					let ox = cx * CHUNK_WIDTH;
					
					for(let lz=0, i=0; lz < CHUNK_WIDTH; lz++) {
						let z = oz + lz;
						
						for(let ly=0; ly < CHUNK_WIDTH; ly++) {
							let y = oy + ly;
							
							for(let lx=0; lx < CHUNK_WIDTH; lx++, i++) {
								let x = ox + lx;
								let h = this.getHeight(x, z);
								
								if(y - 1 === h
									&& this.getHeight(x, z + 1) > h
									&& this.getHeight(x - 1, z) >= h
									&& this.getHeight(x + 1, z) >= h
								) {
									this.putSlope(world, x,   y, z, 0b1100);
									this.putSlope(world, x-1, y, z, 0b1000);
									this.putSlope(world, x+1, y, z, 0b0100);
								}
								if(y - 1 === h
									&& this.getHeight(x, z - 1) > h
									&& this.getHeight(x - 1, z) >= h
									&& this.getHeight(x + 1, z) >= h
								) {
									this.putSlope(world, x,   y, z, 0b0011);
									this.putSlope(world, x-1, y, z, 0b0010);
									this.putSlope(world, x+1, y, z, 0b0001);
								}
								if(y - 1 === h
									&& this.getHeight(x + 1, z) > h
									&& this.getHeight(x, z - 1) >= h
									&& this.getHeight(x, z + 1) >= h
								) {
									this.putSlope(world, x, y, z,   0b1010);
									this.putSlope(world, x, y, z-1, 0b1000);
									this.putSlope(world, x, y, z+1, 0b0010);
								}
								if(y - 1 === h
									&& this.getHeight(x - 1, z) > h
									&& this.getHeight(x, z - 1) >= h
									&& this.getHeight(x, z + 1) >= h
								) {
									this.putSlope(world, x, y, z,   0b0101);
									this.putSlope(world, x, y, z-1, 0b0100);
									this.putSlope(world, x, y, z+1, 0b0001);
								}
							}
						}
					}
				}
			}
		}
	}
	
	putSlope(world, x, y, z, sl)
	{
		if(!world.isSolidBlock(x, y, z) || world.getBlockSlope(x, y, z) > 0) {
			world.setBlock(x, y, z, world.getBlockId(x, y - 1, z), sl, true);
		}
	}
	
	genChunk(x, y, z)
	{
		let cx = x * CHUNK_WIDTH;
		let cy = y * CHUNK_WIDTH;
		let cz = z * CHUNK_WIDTH;
		
		for(let bz=0, i=0; bz < CHUNK_WIDTH; bz++) {
			for(let bx=0; bx < CHUNK_WIDTH; bx++, i++) {
				let h  = this.sample(cx + bx, cz + bz);
				let fh = Math.floor(h);
				
				this.heightCache[i] = fh;
			}
		}
		
		for(let bz=0, i=0; bz < CHUNK_WIDTH; bz++) {
			for(let by=0; by < CHUNK_WIDTH; by++) {
				for(let bx=0; bx < CHUNK_WIDTH; bx++, i++) {
					let fh = this.heightCache[bz * CHUNK_WIDTH + bx];
					
					if(cy + by < fh) {
						this.buf[i] = 2;
					}
					else if(cy + by === fh) {
						this.buf[i] = 3;
					}
					else {
						this.buf[i] = 0;
					}
				}
			}
		}
		
		return this.buf;
	}
	
	getHeightCache()
	{
		return this.heightCache;
	}
}
