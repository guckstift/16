import {xorshift, lerp, smoother} from "./math.js";

export default class ValueNoise
{
	constructor(seed)
	{
		let state = this.state = seed || 3141592653;
		let rands = this.rands = new Float64Array(256);
		let px = this.px = new Uint8Array(512);
		let py = this.py = new Uint8Array(512);
		let pz = this.pz = new Uint8Array(512);

		for(let i=0; i<256; i++) {
			rands[i] = this.rand() / 0xffFFffFF * 2 - 1;
			px[i] = i;
			py[i] = i;
			pz[i] = i;
		}

		for(let i=255; i>0; i--) {
			let j = this.rand() % i;
			let t = px[i];
			px[i] = px[i + 256] = px[j];
			px[j] = px[j + 256] = t;
			j = this.rand() % i;
			t = py[i];
			py[i] = py[i + 256] = py[j];
			py[j] = py[j + 256] = t;
			j = this.rand() % i;
			t = pz[i];
			pz[i] = pz[i + 256] = pz[j];
			pz[j] = pz[j + 256] = t;
		}
	}

	rand()
	{
		return this.state = xorshift(this.state);
	}

	value2(x, y)
	{
		let ix = Math.floor(x);
		let iy = Math.floor(y);
		x -= ix;
		y -= iy;
		ix &= 255;
		iy &= 255;
		let u = smoother(x), v = smoother(y);
		let X = x - 1, Y = y - 1;
		let px = this.px, py = this.py;
		let rands = this.rands;
		let a = px[ix] + iy, b = px[ix + 1] + iy;
		let aa = py[a], ab = py[a + 1];
		let ba = py[b], bb = py[b + 1];
		aa = rands[aa];
		ab = rands[ab];
		ba = rands[ba];
		bb = rands[bb];
		
		return lerp(v, lerp(u, aa, ba),
			           lerp(u, ab, bb));
	}

	value3(x, y, z)
	{
		let ix = Math.floor(x);
		let iy = Math.floor(y);
		let iz = Math.floor(z);
		x -= ix;
		y -= iy;
		z -= iz;
		ix &= 255;
		iy &= 255;
		iz &= 255;
		let u = smoother(x), v = smoother(y), w = smoother(z);
		let X = x - 1, Y = y - 1, Z = z - 1;
		let px = this.px, py = this.py, pz = this.pz;
		let rands = this.rands;
		let a = px[ix] + iy, b = px[ix + 1] + iy;
		let aa = py[a] + iz, ab = py[a + 1] + iz;
		let ba = py[b] + iz, bb = py[b + 1] + iz;
		let aaa = pz[aa], aab = pz[aa + 1];
		let aba = pz[ab], abb = pz[ab + 1];
		let baa = pz[ba], bab = pz[ba + 1];
		let bba = pz[bb], bbb = pz[bb + 1];
		aaa = rands[aaa];
		aab = rands[aab];
		aba = rands[aba];
		abb = rands[abb];
		baa = rands[baa];
		bab = rands[bab];
		bba = rands[bba];
		bbb = rands[bbb];
		
		return lerp(w, lerp(v, lerp(u, aaa, baa),
			                   lerp(u, aba, bba)),
			           lerp(v, lerp(u, aab, bab),
			                   lerp(u, abb, bbb)));
	}

	fractal2(o, x, y, p = 0.5)
	{
		let f = 0;
		let m = 0;
		let s = 1;
		let a = 1;
		
		for(let i=0; i<o; i++) {
			f += this.value2(x * s, y * s) * a;
			m += a;
			s *= 2;
			a *= p;
		}
		
		return f / m;
	}

	fractal3(o, x, y, z, p = 0.5)
	{
		let f = 0;
		let m = 0;
		let s = 1;
		let a = 1;
		
		for(let i=0; i<o; i++) {
			f += this.value3(x * s, y * s, z * s) * a;
			m += a;
			s *= 2;
			a *= p;
		}
		
		return f / m;
	}
}
