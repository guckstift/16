import {noise3d} from "./noise.js";
import {smoothMix3d} from "./math.js";
import {WORLD_WIDTH} from "./worldmetrics.js";

export class NoiseLayer
{
	constructor(lod, dims, amp, seed)
	{
		let width   = WORLD_WIDTH >> lod;
		let samples = new Float64Array(width ** dims);
		
		let sizes = [
			dims >= 1 ? width : 1,
			dims >= 2 ? width : 1,
			dims >= 3 ? width : 1,
		];
		
		for(let z=0; z < sizes[2]; z++) {
			for(let y=0; y < sizes[1]; y++) {
				for(let x=0; x < sizes[0]; x++) {
					samples[(z * width + y) * width + x] = noise3d(x, y, z, seed) * amp;
				}
			}
		}
		
		this.width    = width;
		this.samples  = samples;
		this.sizes    = sizes;
		this.scale    = 1 << lod;
		this.invscale = 1 / this.scale;
	}
	
	discreteSample(x, y, z)
	{
		if(
			x < 0 || x >= this.sizes[0] ||
			y < 0 || y >= this.sizes[1] ||
			z < 0 || z >= this.sizes[2]
		) {
			return 0;
		}
		
		return this.samples[(z * this.width + y) * this.width + x];
	}
	
	sample(x = 0, y = 0, z = 0)
	{
		x *= this.invscale;
		y *= this.invscale;
		z *= this.invscale;
		
		let ix  = Math.floor(x);
		let iy  = Math.floor(y);
		let iz  = Math.floor(z);
		let aaa = this.discreteSample(ix,     iy,     iz);
		let baa = this.discreteSample(ix + 1, iy,     iz);
		let aba = this.discreteSample(ix,     iy + 1, iz);
		let bba = this.discreteSample(ix + 1, iy + 1, iz);
		let aab = this.discreteSample(ix,     iy,     iz + 1);
		let bab = this.discreteSample(ix + 1, iy,     iz + 1);
		let abb = this.discreteSample(ix,     iy + 1, iz + 1);
		let bbb = this.discreteSample(ix + 1, iy + 1, iz + 1);
		
		return smoothMix3d(aaa, baa, aba, bba, aab, bab, abb, bbb, x - ix, y - iy, z - iz);
	}
}
