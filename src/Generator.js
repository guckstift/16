import {NoiseLayer2d} from "./NoiseLayer2d.js";
import {CHUNK_SIZE, CHUNK_WIDTH, localBlockIndex, localBlockX, localBlockY, localBlockZ}
	from "./worldmetrics.js";

export class Generator
{
	constructor()
	{
		this.layers = [
			new NoiseLayer2d(1, 1,  12345),
			new NoiseLayer2d(4, 16, 23451),
			new NoiseLayer2d(6, 64, 34512),
			//new NoiseLayer2d(2, 2, 12345),
		];
		
		this.buf   = new Uint8Array(CHUNK_SIZE);
	}
	
	sample(x, y, z)
	{
		return this.layers.reduce((a,c) => a + c.sample(x, y, z), 0);
	}
	
	genChunk(x, y, z)
	{
		this.buf
		
		let cx = x * CHUNK_WIDTH;
		let cy = y * CHUNK_WIDTH;
		let cz = z * CHUNK_WIDTH;
		
		for(let bz=0, i=0; bz < CHUNK_WIDTH; bz++) {
			for(let by=0; by < CHUNK_WIDTH; by++) {
				for(let bx=0; bx < CHUNK_WIDTH; bx++, i++) {
					let h  = this.sample(cx + bx, cz + bz);
					let fh = Math.floor(h);
					
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
}
