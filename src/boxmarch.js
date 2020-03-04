const sqrt  = Math.sqrt;
const floor = Math.floor;
const ceil  = Math.ceil;
const abs   = Math.abs;

let dir      = new Float64Array(3); // direction normal
let step     = new Float64Array(3); // step (+1 or -1) per axis
let waydelta = new Float64Array(3); // way increment per axis
let waynext  = new Float64Array(3); // way point at next grid boundary for each axis 
let lead     = new Float64Array(3); // leading box corner
let leadvox  = new Float64Array(3); // voxel of leading corner
let trailvox = new Float64Array(3); // voxel of trailing corner

/*
	march an axis-aligned box (boxmin,boxmax) along vector vec and find collision with first solid voxel getvox(x,y,z)
	returns undefined when no collision
	returns {axis, pos, step} on collision
		axis: 0,1 or 2 specifying the collsion axis
		pos: collision coordinate on the axis
		step: axis step (-1 or +1)
*/
export default function boxmarch(boxmin, boxmax, vec, getvox)
{
	let len      = sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
	let way      = 0;
	let axis     = 0;
	let distnext = 0;
	let trail    = 0;
	let slope    = 0;
	
	if(len === 0) {
		return;
	}
	
	for(let k=0; k<3; k++) {
		dir[k]      = vec[k] / len;
		waydelta[k] = abs(1 / dir[k]);
		
		if(dir[k] > 0) {
			step[k]     = 1;
			lead[k]     = boxmax[k];
			trail       = boxmin[k];
			leadvox[k]  = ceil(lead[k]) - 1;
			trailvox[k] = floor(trail);
			distnext    = ceil(lead[k]) - lead[k];
		}
		else {
			step[k]     = -1;
			lead[k]     = boxmin[k];
			trail       = boxmax[k];
			leadvox[k]  = floor(lead[k]);
			trailvox[k] = ceil(trail) - 1;
			distnext    = lead[k] - floor(lead[k]);
		}
		
		if(waydelta[k] === Infinity) {
			waynext[k] = Infinity;
		}
		else {
			waynext[k] = waydelta[k] * distnext;
		}
	}
	
	while(way <= len) {
		if(waynext[0] < waynext[1] && waynext[0] < waynext[2]) {
			axis = 0;
		}
		else if(waynext[1] < waynext[2]) {
			axis = 1;
		}
		else {
			axis = 2;
		}
		
		way             = waynext[axis];
		waynext[axis]  += waydelta[axis];
		leadvox[axis]  += step[axis];
		trailvox[axis] += step[axis];
		
		if(way <= len) {
			let xs = axis === 0 ? leadvox[0] : trailvox[0];
			let ys = axis === 1 ? leadvox[1] : trailvox[1];
			let zs = axis === 2 ? leadvox[2] : trailvox[2];
			let xe = leadvox[0] + step[0];
			let ye = leadvox[1] + step[1];
			let ze = leadvox[2] + step[2];

			for(let x = xs; x !== xe; x += step[0]) {
				for(let y = ys; y !== ye; y += step[1]) {
					for(let z = zs; z !== ze; z += step[2]) {
						if(getvox(x, y, z)) {
							return {
								axis,
								step: step[axis],
								pos:  lead[axis] + way * dir[axis], // collision pos on axis
							};
						}
					}
				}
			}
		}
	}
}
