export default class NoiseLayer
{
	constructor(scale, amp, seed)
	{
		let width   = 256 / scale;
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

function noise2d(x, y, s)
{
	x *= 15485863;  // mult with 1000000. prime
	y *= 285058399; // mult with 15485863. prime
	x += y;
	x *= s || 1;
	x ^= x >> 2;   // xor with r-shift with 1. prime
	x ^= x << 5;   // xor with l-shift with 3. prime
	x ^= x >> 11;  // xor with r-shift with 5. prime
	x ^= x << 17;  // xor with l-shift with 7. prime
	x ^= x >> 23;  // xor with r-shift with 9. prime
	x ^= x << 31;  // xor with l-shift with 11. prime
	
	return (x + 0x80000000) / 0xFFffFFff;
}

function smoothMix(a, b, x)
{
	return a + x ** 2 * (3 - 2 * x) * (b - a);
}

function smoothMix2d(aa, ba, ab, bb, x, y)
{
	return smoothMix(
		smoothMix(aa, ba, x),
		smoothMix(ab, bb, x),
		y,
	);
}
