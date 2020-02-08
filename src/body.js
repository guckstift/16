import Movable from "./movable.js";
import vec3 from "./math/vec3.js";
import boxmarch from "./voxels/boxmarch.js";
import boxsweep from "./voxels/boxsweep.js";

let sweep;
let deltavel = vec3();
let boxmin = vec3();
let boxmax = vec3();

export default class Body extends Movable
{
	constructor(
		map,
		eyehight = 0,
		boxmin = vec3(-0.25, -0.25, -0.25),
		boxmax = vec3( 0.25,  0.25,  0.25)
	) {
		super();
		
		this.map = map;
		this.eyehight = eyehight;
		this.boxmin = boxmin;
		this.boxmax = boxmax;
		this.rest = vec3();
	}
	
	update(delta)
	{
		super.update(delta);
		if(this.rest[0]) this.vel[0] = 0;
		if(this.rest[1]) this.vel[1] = 0;
		if(this.rest[2]) this.vel[2] = 0;
	}
	
	move(vel, delta)
	{
		vec3.scale(vel, delta, deltavel);
		vec3.add(this.pos, this.boxmin, boxmin);
		vec3.add(this.pos, this.boxmax, boxmax);
		sweep = boxsweep(boxmin, boxmax, deltavel, this.map.getVox);
		vec3.copy(sweep.rest, this.rest);
		vec3.add(this.pos, sweep.disp, this.pos);
		//this.slopeLiftUp(boxmin, boxmax);
	}
	
	slopeLiftUp(boxmin, boxmax)
	{
		let x0  = boxmin[0];
		let x1  = boxmax[0];
		let y0  = boxmin[1];
		let y1  = boxmax[1];
		let ix0 = Math.floor(x0);
		let ix1 = Math.ceil(x1) - 1;
		let iy0 = Math.floor(y0);
		let iy1 = Math.ceil(y1) - 1;
		let z   = boxmin[2];
		let iz  = Math.floor(z);
		
		let samples = [
			[x0, y0, ix0, iy0],
			[x1, y0, ix1, iy0],
			[x0, y1, ix0, iy1],
			[x1, y1, ix1, iy1],
		];
		
		samples.forEach(([x, y, ix, iy]) => {
			if(this.map.isSolid(ix, iy, iz)) {
				let sl   = this.map.getSlope(ix, iy, iz);
				
				let minz = sl === 0b1100 ? iz + y - iy :
				           sl === 0b1010 ? iz + x - ix :
				           sl === 0b0011 ? iz + iy - y + 1 :
				           sl === 0b0101 ? iz + ix - x + 1 :
				           0;
				
				this.pos[2] = Math.max(this.pos[2], minz);
				
				if(this.pos[2] === minz) {
					this.rest[2] = -1;
				}
			}
		});
	}
}
