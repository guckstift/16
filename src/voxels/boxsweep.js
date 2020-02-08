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
	
	for(let i=0; i<3; i++) {
		let hit = boxmarch(boxmin, boxmax, vec, getvox);
		
		if(!hit) {
			break;
		}
		
		if(hit.step > 0) {
			boxmin[hit.axis] += hit.pos - boxmax[hit.axis];
			boxmax[hit.axis]  = hit.pos;
		}
		else {
			boxmax[hit.axis] -= boxmin[hit.axis] - hit.pos;
			boxmin[hit.axis]  = hit.pos;
		}
		
		vec[hit.axis]  = 0;
		rest[hit.axis] = hit.step;
	}
	
	disp[0] = boxmin[0] - bmin[0] + vec[0];
	disp[1] = boxmin[1] - bmin[1] + vec[1];
	disp[2] = boxmin[2] - bmin[2] + vec[2];
	
	return {disp, rest};
}
