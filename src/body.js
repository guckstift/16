import Movable from "./movable.js";
import vec3 from "./vec3.js";
import boxmarch from "./boxmarch.js";
import boxsweep from "./boxsweep.js";

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
		sweep = boxsweep(boxmin, boxmax, deltavel, this.map.getVoxel);
		vec3.copy(sweep.rest, this.rest);
		vec3.add(this.pos, sweep.disp, this.pos);
		vec3.add(boxmin, sweep.disp, boxmin);
		vec3.add(boxmax, sweep.disp, boxmax);
	}
}
