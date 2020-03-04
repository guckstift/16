import boxmarch from "./boxmarch.js";

let boxmin = new Float64Array(3); // boxmin cache
let boxmax = new Float64Array(3); // boxmax cache
let vec    = new Float64Array(3); // march vec cache
let rest   = new Float64Array(3); // resting directions
let disp   = new Float64Array(3); // displacement result

/*
	sweep an axis-aligned box (bmin,bmax) along vector pvec and slide along solid voxels getvox(x,y,z)
	returns {disp, rest}
		disp: displacement result vector to be added to the position
		rest: axis directions where the box got blocked (0, -1 or +1 for each axis)
*/
export default function boxsweep(bmin, bmax, pvec, getvox)
{
	boxmin.set(bmin);
	boxmax.set(bmax);
	vec.set(pvec);
	rest[0] = 0;
	rest[1] = 0;
	rest[2] = 0;
	
	let getfullvox = (x,y,z) => {
		let v = getvox(x,y,z);
		return (v >> 8 & 0xf) ? 0 : v;
	}
	
	for(let i=0; i<3; i++) {
		let hit = boxmarch(boxmin, boxmax, vec, getfullvox);
		
		if(!hit) {
			break;
		}
		
		let change = hit.pos - (hit.step > 0 ? boxmax[hit.axis] : boxmin[hit.axis]);
		boxmin[hit.axis] += change;
		boxmax[hit.axis] += change;
		let lift = slopelift(getvox);
		
		if(lift.lift && hit.axis !== 2) {
			boxmin[2]     += lift.lift;
			boxmax[2]     += lift.lift;
			vec[hit.axis] -= change;
			rest[2] = -1;
		}
		else {
			vec[hit.axis]  = 0;
			rest[hit.axis] = hit.step;
		}
	}
	
	disp[0] = boxmin[0] - bmin[0] + vec[0];
	disp[1] = boxmin[1] - bmin[1] + vec[1];
	disp[2] = boxmin[2] - bmin[2] + vec[2];
	boxmin[0] += vec[0];
	boxmin[1] += vec[1];
	boxmin[2] += vec[2];
	boxmax[0] += vec[0];
	boxmax[1] += vec[1];
	boxmax[2] += vec[2];
	let lift = slopelift(getvox);
	disp[2] += lift.lift;
	if(lift.rest) rest[2] = -1;
	
	return {disp, rest};
}

function slopelift(getvox)
{
	let x0   = boxmin[0];
	let x1   = boxmax[0];
	let y0   = boxmin[1];
	let y1   = boxmax[1];
	let ix0  = Math.floor(x0);
	let ix1  = Math.ceil(x1) - 1;
	let iy0  = Math.floor(y0);
	let iy1  = Math.ceil(y1) - 1;
	let z    = boxmin[2];
	let iz   = Math.floor(z);
	let rest = false;
	
	let samples = [
		[x0, y0, ix0, iy0],
		[x1, y0, ix1, iy0],
		[x0, y1, ix0, iy1],
		[x1, y1, ix1, iy1],
	];
	
	samples.forEach(([x, y, ix, iy]) => {
		let v  = getvox(ix,iy,iz);
		let sl = v >> 8 & 0xf;
		
		if(sl) {
			let minz = sl === 0b1100 ? iz + y - iy :
			           sl === 0b1010 ? iz + x - ix :
			           sl === 0b0011 ? iz + iy - y + 1 :
			           sl === 0b0101 ? iz + ix - x + 1 :
			           sl === 0b1000 ? Math.min(iz + y - iy,     iz + x - ix) :
			           sl === 0b0100 ? Math.min(iz + y - iy,     iz + ix - x + 1) :
			           sl === 0b0010 ? Math.min(iz + iy - y + 1, iz + x - ix) :
			           sl === 0b0001 ? Math.min(iz + iy - y + 1, iz + ix - x + 1) :
			           sl === 0b1110 ? Math.max(iz + y - iy,     iz + x - ix) :
			           sl === 0b1101 ? Math.max(iz + y - iy,     iz + ix - x + 1) :
			           sl === 0b1011 ? Math.max(iz + iy - y + 1, iz + x - ix) :
			           sl === 0b0111 ? Math.max(iz + iy - y + 1, iz + ix - x + 1) :
			           0;
			
			if(z < minz) {
				z    = minz;
				iz   = Math.floor(z);
				rest = true;
			}
		}
	});
	
	let lift = z - boxmin[2];
	return {lift, rest};
}
