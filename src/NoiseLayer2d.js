import {noise2d} from "../gluck/noise.js";
import {smoothMix2d} from "../gluck/math.js";
import {WORLD_WIDTH} from "./worldmetrics.js";

export class NoiseLayer2d
{
	constructor(scale, amp, seed)
	{
		let width   = WORLD_WIDTH / scale;
		let samples = new Float64Array(width ** 2);
		
		for(let y = 0; y < width; y++) {
			for(let x = 0; x < width; x++) {
				samples[y * width + x] = noise2d(x, y, seed) * amp;
			}
		}
		
		this.width   = width;
		this.samples = samples;
		this.scale   = scale;
		this.div     = 1 / scale;
	}
	
	discreteSample(x, y)
	{
		if(x <= 0 || x >= this.width || y <= 0 || y >= this.width) {
			return 0;
		}
		
		return this.samples[y * this.width + x];
	}
	
	sample(x, y)
	{
		x *= this.div;
		y *= this.div;
		
		let ix = Math.floor(x);
		let iy = Math.floor(y);
		let aa = this.discreteSample(ix,     iy);
		let ba = this.discreteSample(ix + 1, iy);
		let ab = this.discreteSample(ix,     iy + 1);
		let bb = this.discreteSample(ix + 1, iy + 1);
		
		return smoothMix2d(aa, ba, ab, bb, x - ix, y - iy);
	}
}
