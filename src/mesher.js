import blocks from "./blocks.js";

let dims  = [16, 16, 256];
let cache = Array(9).fill().map(() => new Uint16Array(16 * 16 * 256));
let i     = new Float64Array(3);
let j     = new Float64Array(3);
let k     = new Float64Array(3);
let n     = new Float64Array(3);
let map   = new Uint16Array(256 * 16);
let aomap = new Uint16Array(256 * 16);
let flips = new Uint8Array(256 * 16);
let mesh  = new Uint8Array(16 * 16 * 256 * 6 * 8 / 2);

let axescode = {
	0: { 1: 0,   //xy
	     2: 1 }, //xz
	1: { 0: 2,   //yx
	     2: 3 }, //yz
	2: { 0: 4,   //zx
	     1: 5 }, //zy
};

let cornersplits = {
	0b1000: [0b1010, 0b1100],
	0b0100: [0b0101, 0b1100],
	0b0010: [0b0011, 0b1010],
	0b0001: [0b0011, 0b0101],
	0b1110: [0b1100, 0b1010],
	0b1101: [0b1100, 0b0101],
	0b1011: [0b1010, 0b0011],
	0b0111: [0b0101, 0b0011],
};

function getsl(i,x,y,z)
{
	let v = vox(i[0] + x, i[1] + y, i[2] + z);
	let s = v >> 8 & 0xf;
	return v ? s ? s : 0b1111 : 0;
}

function tstbits(sl,bits)
{
	return (sl & bits) === bits;
}

function vox(x, y, z)
{
	let cx = x < 0 ? 0 : x >= 16 ? 2 : 1;
	let cy = y < 0 ? 0 : y >= 16 ? 2 : 1;
	let chunk = cache[cx + cy * 3];
	let rx = (x + 16) % 16;
	let ry = (y + 16) % 16;
	return z < 0 ? 1 : chunk[rx + ry * 16 + z * 16 * 16];
}

function vis(x, y, z)
{
	let v = vox(x, y, z);
	let sl = v >> 8;
	return v > 0 && sl === 0;
}

function slo(x, y, z)
{
	return vox(x, y, z) >> 8 & 0xf;
}

function voxp(i)
{
	return vox(i[0], i[1], i[2]);
}

function visp(i)
{
	return vis(i[0], i[1], i[2]);
}

function slop(i)
{
	return slo(i[0], i[1], i[2]);
}

function isSlope(sl)
{
	return sl === 0b0011 || sl === 0b1100 || sl === 0b0101 || sl === 0b1010;
}

function isOuterCorner(sl)
{
	return sl === 0b1000 || sl === 0b0100 || sl === 0b0010 || sl === 0b0001;
}

function isInnerCorner(sl)
{
	return sl === 0b0111 || sl === 0b1011 || sl === 0b1101 || sl === 0b1110;
}

function facevis(i, n)
{
	let here = voxp(i);
	let adj  = vox(i[0] + n[0], i[1] + n[1], i[2] + n[2]);
	let sl   = here >> 8 & 0xf;
	let asl  = adj >> 8 & 0xf;
	
	if(sl > 0 && sl < 0b1111) {
		return n[2] === 1 && sl ? here : 0;
	}
	
	if(asl === 0) {
		return adj ? 0 : here & 0xff;
	}
	
	if(asl === 0b1111) {
		return here & 0xff;
	}
	
	if(n[0] === +1 && (asl & 0b0101) === 0b0101 ||
	   n[0] === -1 && (asl & 0b1010) === 0b1010 ||
	   n[1] === +1 && (asl & 0b0011) === 0b0011 ||
	   n[1] === -1 && (asl & 0b1100) === 0b1100 ||
	   n[2] === +1
	) {
		return 0;
	}
	
	return here & 0xff;
}

function faceAO(I, ax0, ax1)
{
	let ao0, ao1, ao2, ao00, ao10, ao01, ao11;
	let isup = 1;n[2] > 0;
	let self = getsl(i, n[0], n[1], n[2]);
	
	j[0] = i[0] + n[0];
	j[1] = i[1] + n[1];
	j[2] = i[2] + n[2];
	
	j[ax0] --; ao0 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	j[ax1] --; ao1 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	j[ax0] ++; ao2 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	ao00 = ao0 === 1 && ao2 === 1 ? 0 : 3 - ao0 - ao1 - ao2;
	ao00 -= self ? 0.25 : 0;
	
	           ao0 = ao2;
	j[ax0] ++; ao1 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	j[ax1] ++; ao2 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	ao10 = ao0 === 1 && ao2 === 1 ? 0 : 3 - ao0 - ao1 - ao2;
	ao10 -= self ? 0.25 : 0;
	
	           ao0 = ao2;
	j[ax1] ++; ao1 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	j[ax0] --; ao2 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	ao11 = ao0 === 1 && ao2 === 1 ? 0 : 3 - ao0 - ao1 - ao2;
	ao11 -= self ? 0.25 : 0;
	
	           ao0 = ao2;
	j[ax0] --; ao1 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	j[ax1] --; ao2 = visp(j) ? 1 : isup && slop(j) ? 0.25 : 0;
	ao01 = ao0 === 1 && ao2 === 1 ? 0 : 3 - ao0 - ao1 - ao2;
	ao01 -= self ? 0.25 : 0;
	
	aomap[I] = ao00 | ao10 << 2 | ao01 << 4 | ao11 << 6;
	flips[I] = ao00 + ao11 > ao10 + ao01;
}

function slopeAO(I, sl, rsl = sl)
{
	let ao00,  ao10,  ao01,  ao11;
	    ao00 = ao10 = ao01 = ao11 = 3;
	let opos, t, l, r;
	let fx = 0, fy = 0, lx = 0, ly = 0, rx = 0, ry = 0, flx = 0, fly = 0;
	let ord = [0,1,2,3];
	
	if(sl === 0b1100) {
		fy = -1; lx = -1; l = 0b0101; r = 0b1010;
	}
	else if(sl === 0b0011) {
		fy = +1; lx = +1; l = 0b1010; r = 0b0101;
		ord = [3,2,1,0];
	}
	else if(sl === 0b1010) {
		fx = -1; ly = +1; l = 0b1100; r = 0b0011;
		ord = [2,0,3,1];
	}
	else if(sl === 0b0101) {
		fx = +1; ly = -1; l = 0b0011; r = 0b1100;
		ord = [1,3,0,2];
	}
	
	rx = -lx; ry = -ly;
	opos = ~sl & 0xf;
	
	let slu   = getsl(i, 0, 0,+1);
	let slf   = getsl(i,fx,fy, 0);
	let slfd  = getsl(i,fx,fy,-1);
	let slbu  = getsl(i,-fx,-fy,+1);
	let sll   = getsl(i,lx,ly, 0);
	let sllu  = getsl(i,lx,ly,+1);
	let sllf  = getsl(i,lx + fx, ly + fy, 0);
	let sllfd = getsl(i,lx + fx, ly + fy,-1);
	let sllbu = getsl(i,lx - fx, ly - fy,+1);
	let slr   = getsl(i,rx,ry, 0);
	let slru  = getsl(i,rx,ry,+1);
	let slrf  = getsl(i,rx + fx, ry + fy, 0);
	let slrfd = getsl(i,rx + fx, ry + fy,-1);
	let slrbu = getsl(i,rx - fx, ry - fy,+1);
	
	ao00 -= (slf & sl & l)    ? 1.5 :
	        (slf & opos & l)  ? 1.0 :
	        tstbits(slfd, l)  ? 0.5 : 0;
	ao10 -= (slf & sl & r)    ? 1.5 :
	        (slf & opos & r)  ? 1.0 :
	        tstbits(slfd, r)  ? 0.5 : 0;
	ao01 -= slu               ? 1.5 :
	        (slbu & opos & l) ? 0.5 : 0;
	ao11 -= slu               ? 1.5 :
	        (slbu & opos & r) ? 0.5 : 0;
	
	ao00 -= (sll & opos & r)   ? 0.5 : 0;
	ao00 -= (sllf & sl & r)    ? 1.0 :
	        (sllf & opos & r)  ? 0.5 : 0;
	ao00 -= tstbits(sllfd, r)  ? 0.5 : 0;
	
	ao10 -= (slr & opos & l)   ? 0.5 : 0;
	ao10 -= (slrf & sl & l)    ? 1.0 :
	        (slrf & opos & l)  ? 0.5 : 0;
	ao10 -= tstbits(slrfd, l)  ? 0.5 : 0;
	
	ao01 -= tstbits(sll, r)    ? 0.5 : 0;
	ao01 -= (sllu & sl & r)    ? 1.0 :
	        (sllu & opos & r)  ? 0.5 : 0;
	ao01 -= (sllbu & opos & r) ? 0.5 : 0;
	
	ao11 -= tstbits(slr, l)    ? 0.5 : 0;
	ao11 -= (slru & sl & l)    ? 1.0 :
	        (slru & opos & l)  ? 0.5 : 0;
	ao11 -= (slrbu & opos & l) ? 0.5 : 0;
	
	//ao00 -= (rsl & opos & r) ? 0.25 : 0;
	//ao10 -= (rsl & opos & r) ? 0.25 : 0;
	ao01 -= (rsl & opos & l) ? 0.25 : 0;
	ao11 -= (rsl & opos & r) ? 0.25 : 0;
	
	aomap[I] = ao00 << (2*ord[0]) | ao10 << (2*ord[1])
	         | ao01 << (2*ord[2]) | ao11 << (2*ord[3]);
	flips[I] = ao00 + ao11 > ao10 + ao01;
	
}

function outCornerAO(I, sl)
{
	slopeAO(I, cornersplits[sl][1], sl);
	let ao = aomap[I];
	slopeAO(I, cornersplits[sl][0], sl);
	aomap[I] |= ao << 8;
	flips[I] = sl === 0b1000 || sl === 0b0001;
}

function inCornerAO(I, sl)
{
	slopeAO(I, cornersplits[sl][1], sl);
	let ao = aomap[I];
	slopeAO(I, cornersplits[sl][0], sl);
	aomap[I] |= ao << 8;
	flips[I] = sl === 0b0111 || sl === 0b1110;
}

onmessage = e => {
	let cx       = e.data.cx;
	let cy       = e.data.cy;
	let vicinity = e.data.vicinity;
	let count    = 0;
	let t0       = performance.now();
	let ox       = cx * 16;
	let oy       = cy * 16;
	let op       = [ox, oy, 0];
	let face     = 0;
	
	let emit = (ax0,ax1,ax2,sl,I,axc) => {
		let offs = count * 8;
		mesh[offs + 0] = i[ax0] + op[ax0];
		mesh[offs + 1] = i[ax1] + op[ax1];
		mesh[offs + 2] = j[ax0] - i[ax0] - 1;
		mesh[offs + 3] = k[ax1] - i[ax1] - 1;
		mesh[offs + 4] = i[ax2] + op[ax2];
		mesh[offs + 5] = axc | flips[I] << 3 | sl << 4;
		mesh[offs + 6] = blocks[map[I] & 0xff].tiles[face];
		mesh[offs + 7] = aomap[I];
		count ++;
	}
	
	for(let i = 0; i < 9; i ++) {
		let data  = vicinity[i];
		let chunk = cache[i];
		
		for(let j = 0; j < data.length; j += 2) {
			let start = data[j + 0];
			let value = data[j + 1];
			let end   = data[j + 2] || 16 * 16 * 256;
			chunk.fill(value, start, end);
		}
	}
	
	//console.log(performance.now() - t0, "unpacking done");
	
	for(let ax2 = 0; ax2 < 3; ax2 ++) {
		for(let a = -1; a <= +1; a += 2) {
			let ax1 = (ax2 + a + 3) % 3;
			let ax0 = 3 - ax1 - ax2;
			n[0] = ax2 !== 0 ? 0 : ax1 === 2 ? +1 : -1;
			n[1] = ax2 !== 1 ? 0 : ax1 === 0 ? +1 : -1;
			n[2] = ax2 !== 2 ? 0 : ax1 === 1 ? +1 : -1;
			let I, J, sl, offs, ao, ao0, ao1, ao2, ao00, ao10, ao01, ao11;
			face = n[0] < 0 ? 0 : n[0] > 0 ? 1 :
			       n[1] < 0 ? 2 : n[1] > 0 ? 3 :
			       n[2] < 0 ? 4 : n[2] > 0 ? 5 :
			       0;
			
			for(         i[ax2] = 0;        i[ax2] < dims[ax2]; i[ax2] ++       ) {
				for(     i[ax1] = 0, I = 0; i[ax1] < dims[ax1]; i[ax1] ++       ) {
					for( i[ax0] = 0;        i[ax0] < dims[ax0]; i[ax0] ++, I ++ ) {
						if(map[I] = facevis(i, n)) {
							sl = map[I] >> 8 & 0xf;
							
							if(isSlope(sl)) {
								slopeAO(I, sl);
							}
							else if(isOuterCorner(sl)) {
								outCornerAO(I, sl);
							}
							else if(isInnerCorner(sl)) {
								inCornerAO(I, sl);
							}
							else {
								faceAO(I, ax0, ax1);
							}
						}
					}
				}
				
				for(     i[ax1] = 0, I = 0; i[ax1] < dims[ax1]; i[ax1] ++       ) {
					for( i[ax0] = 0;        i[ax0] < dims[ax0]; i[ax0] ++, I ++ ) {
						if(map[I]) {
							j[ax1] = i[ax1];
							j[ax2] = i[ax2];
							k[ax2] = i[ax2];
							sl     = n[2] === +1 ? map[I] >> 8 & 0xf : 0;
							
							for(     j[ax0] = i[ax0] + 1; j[ax0] < dims[ax0]; j[ax0] ++ ) {
								J = j[ax0] + j[ax1] * dims[ax0];
								
								if(map[I] !== map[J] || aomap[I] !== aomap[J]) {
									break;
								}
								
								map[J] = 0;
							}
							
							outer:
							for(     k[ax1] = i[ax1] + 1; k[ax1] < dims[ax1]; k[ax1] ++ ) {
								for( k[ax0] = i[ax0];     k[ax0] < j[ax0];    k[ax0] ++ ) {
									J = k[ax0] + k[ax1] * dims[ax0];
									
									if(map[I] !== map[J] || aomap[I] !== aomap[J]) {
										break outer;
									}
								}
								
								for( k[ax0] = i[ax0];     k[ax0] < j[ax0];    k[ax0] ++ ) {
									map[k[ax0] + k[ax1] * dims[ax0]] = 0;
								}
							}
							
							if(isOuterCorner(sl) || isInnerCorner(sl)) {
								emit(ax0,ax1,ax2,cornersplits[sl][0],I,6);
								aomap[I] >>= 8;
								emit(ax0,ax1,ax2,cornersplits[sl][1],I,7);
							}
							else {
								emit(ax0,ax1,ax2,sl,I,axescode[ax0][ax1]);
							}
						}
					}
				}
			}
		}
	}
	
	//console.log(performance.now() - t0, "meshing done");
	
	postMessage({cx, cy, mesh: mesh.slice(0, count * 8)});
};
