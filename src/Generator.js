import {NoiseLayer2d} from "./NoiseLayer2d.js";
import {CHUNK_SIZE, CHUNK_WIDTH, localBlockIndex, localBlockX, localBlockY, localBlockZ}
	from "./worldmetrics.js";

export class Generator
{
	constructor()
	{
		this.layer = new NoiseLayer2d(2, 8, 12345);
		this.buf   = new Uint8Array(CHUNK_SIZE);
	}
	
	sample(x, y, z)
	{
		return this.layer.sample(x, y, z);
	}
	
	genChunk(x, y, z)
	{
		this.buf
		
		let cx = x * CHUNK_WIDTH;
		let cy = y * CHUNK_WIDTH;
		let cz = z * CHUNK_WIDTH;
		
		for(let bz=0; bz < CHUNK_WIDTH; bz++) {
			for(let by=0; by < CHUNK_WIDTH; by++) {
				for(let bx=0; bx < CHUNK_WIDTH; bx++) {
					let i = localBlockIndex(bx, by, bz);
					let h = this.layer.sample(cx + bx, cz + bz);
					
					if(cy + by < h) {
						this.buf[i] = 1;
					}
					else {
						this.buf[i] = 0;
					}
				}
			}
		}
		
		return this.buf;
	}
}
