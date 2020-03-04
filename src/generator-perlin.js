import Perlin from "./perlin.js";

let perlin   = new Perlin(183492760);
let heights  = [];
let treemap  = [];
let chunk    = [];
let data     = [];

console.log(perlin);

function clamp(a, b, x)
{
	return Math.max(0, Math.min(1, x));
}

function smooth(x)
{
	return clamp(0, 1, 3 * x**2 - 2 * x**3);
}

function roundBorder(x, y)
{
	//return (1 - (x**2 + y**2));
	//return (1 - x**2) * (1 - y**2);
	let a = (1 - (x**2 + y**2));
	let b = (1 - x**2) * (1 - y**2);
	return b * b;
	
	let max = Math.max;
	return (
		max(0, 1 - x**6) * max(0, 1 - y**6) + max(0, 1 - (x**2 + y**2))
	) * 0.5;
	return Math.max(0, (1 - x ** 6) * (1 - y ** 6));
}

for(let y = 0, i = 0; y < 256; y ++) {
	for(let x = 0; x < 256; x ++, i ++) {
		let rx = x * 2 / 256 - 1;
		let ry = y * 2 / 256 - 1;
		let p  = perlin.fractal2(5, rx, ry, 0.4) * 0.5 + 0.5;
		let f  = p - 0.25;
		//f = smooth(f);
		let h  = Math.max(1, Math.floor(f * roundBorder(rx, ry) * (256 + 64)));
		
		heights[i] = h;
		treemap[i] = 0;
		
		/* /
		//heights[i] = Math.max(1, (y - 10) * 2);
		//continue;
		
		let nx = x / 256;
		let ny = y / 256;
		let p  = 1 - ((2 * (nx - 0.5)) ** 2 + (2 * (ny - 0.5)) ** 2);
		//let p  = perlin.fractal2(3, nx, ny);
		//let h  = p * 0.5 + 0.5
		let h = p;
		
		nx *= 4;
		ny *= 4;
		p   = perlin.fractal2(4, nx, ny);
		h  *= p * 0.5 + 0.5;
		h *= 3;
		h -= 0.25;
		heights[i] = Math.max(1, Math.floor(h * 64));
		treemap[i] = Math.random() < 0.0625 * heights[i] / 96 ? 1 : 0;
		*/
	}
}

function setHeightRect(sx, sy, ex, ey, h)
{
	for(let y=sy; y<ey; y++) {
		for(let x=sx; x<ex; x++) {
			heights[x + y * 256] = h;
		}
	}
}
/*
setHeightRect(2,2, 5,5, 2);
setHeightRect(3,3, 6,6, 2);

setHeightRect(4,4, 5,5, 3);

setHeightRect(4,8, 5,9, 3);

/*
heights[2 + 2 * 256] = 2;
heights[3 + 2 * 256] = 2;
heights[4 + 2 * 256] = 2;
heights[2 + 3 * 256] = 3;
heights[3 + 3 * 256] = 3;
heights[4 + 3 * 256] = 3;
*/
function height(x, y)
{
	return heights[x + y * 256];
}

function treeat(x, y)
{
	return treemap[x + y * 256];
}

function heightForSlope(x, y)
{
	
	return heights[x + y * 256];
}

function slopedir(x, y, z, sl, h, ax0, fax0, pa, pb)
{
	let f   = [0, 0];
	let s   = [0, 0];
	let ps  = [pa,pb];
	let ax1 = 1 - ax0;
	let i   = 0;
	f[ax0]  = fax0;
	
	if(height(x + f[0], y + f[1]) > h) {
		for(s[ax1] = -1; s[ax1] <= +1; s[ax1] += 2, i ++) {
			if(heightForSlope(x + s[0],        y + s[1])        >= h &&
			   heightForSlope(x + s[0] + f[0], y + s[1] + f[1]) >= h
			   //&& treeat(x + s[0],        y + s[1])        === 0 &&
			   //treeat(x + s[0] + f[0], y + s[1] + f[1]) === 0
			) {
				sl |= ps[i];
			}
		}
	}
	
	return sl;
}

function slopecorner(x, y, z, sl, h, nx, ny, p)
{
	if(heightForSlope(x + nx, y + ny) >  h &&
	   heightForSlope(x + nx, y     ) >= h &&
	   heightForSlope(x     , y + ny) >= h
	   //&& treeat(x + nx, y + ny) === 0 &&
	   //treeat(x + nx, y     ) === 0 &&
	   //treeat(x     , y + ny) === 0
	) {
		sl |= p;
	}
	
	return sl;
}

function slope(x, y, z)
{
	let h  = height(x, y);
	let sl = 0;
	
	sl |= slopedir(x, y, z, sl, h, 0, +1, 0b0010, 0b1000);
	sl |= slopedir(x, y, z, sl, h, 0, -1, 0b0001, 0b0100);
	sl |= slopedir(x, y, z, sl, h, 1, +1, 0b0100, 0b1000);
	sl |= slopedir(x, y, z, sl, h, 1, -1, 0b0001, 0b0010);
	
	sl |= slopecorner(x, y, z, sl, h, +1, +1, 0b1000);
	sl |= slopecorner(x, y, z, sl, h, -1, +1, 0b0100);
	sl |= slopecorner(x, y, z, sl, h, +1, -1, 0b0010);
	sl |= slopecorner(x, y, z, sl, h, -1, -1, 0b0001);
	
	if(sl === 0b1111) {
		return 3;
	}
	else if(sl === 0) {
		return 0;
	}
	else {
		return 3 | sl << 8;
	}
}

onmessage = e => {
	let cx = e.data.cx;
	let cy = e.data.cy;
	let t0 = performance.now();
	
	//console.log(performance.now() - t0, "start generating", cx, cy);
	
	for(let z = 0, i = 0; z < 256; z ++) {
		for(let y = 0; y < 16; y ++) {
			let ay = y + cy * 16;
			
			for(let x = 0; x < 16; x ++, i ++) {
				let ax = x + cx * 16;
				let h  = height(ax, ay);
				
				if(z < h - 1) {
					chunk[i] = 2;
				}
				else if(z < h) {
					chunk[i] = 3;
				}
				else if(z === h) {
					if(treemap[ax + ay * 256]) {// && (chunk[i] >> 8 === 0)) {
						chunk[i] = 0b1111 << 8;
					}
					else {
						chunk[i] = slope(ax, ay, z);
					}
				}
				else {
					chunk[i] = 0;
				}
			}
		}
	}
	
	let cur  = undefined;
	let accu = 0;
	let data = [];
	
	for(let i = 0; i < chunk.length; i ++) {
		let v = chunk[i];
		
		if(v !== cur) {
			cur = v;
			data.push(i, v);
		}
	}
	
	postMessage({cx, cy, data});
};

