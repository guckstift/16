import {noise2d} from "./noise.js";
import {smoothMix2d} from "./math.js";
import {WORLD_WIDTH} from "./worldmetrics.js";

export class NoiseLayer2d
{
	constructor(lod, amp, seed)
	{
		let width   = WORLD_WIDTH >> lod;
		let samples = new Float64Array(width ** 2);
		
		for(let y = 0; y < width; y++) {
			for(let x = 0; x < width; x++) {
				samples[y * width + x] = noise2d(x, y, seed) * amp;
			}
		}
		
		this.width    = width;
		this.samples  = samples;
		this.scale    = 1 << lod;
		this.invscale = 1 / this.scale;
	}
	
	discreteSample(x, y)
	{
		if(
			x < 0 || x >= this.width ||
			y < 0 || y >= this.width
		) {
			return 0;
		}
		
		return this.samples[y * this.width + x];
	}
	
	sample(x = 0, y = 0)
	{
		x *= this.invscale;
		y *= this.invscale;
		
		let ix  = Math.floor(x);
		let iy  = Math.floor(y);
		let aa = this.discreteSample(ix,     iy);
		let ba = this.discreteSample(ix + 1, iy);
		let ab = this.discreteSample(ix,     iy + 1);
		let bb = this.discreteSample(ix + 1, iy + 1);
		
		return smoothMix2d(aa, ba, ab, bb, x - ix, y - iy);
	}
}
