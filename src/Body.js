import {Movable} from "../gluck/Movable.js";
import * as vector from "../gluck/vector.js";

let deltavel = vector.create();

export class Body extends Movable
{
	constructor(
		world,
		eyehight = 0,
		boxmin = vector.create(-0.25, -0.25, -0.25),
		boxmax = vector.create( 0.25,  0.25,  0.25),
	) {
		super();
		
		this.world    = world;
		this.eyehight = eyehight;
		this.boxmin   = boxmin;
		this.boxmax   = boxmax;
		this.rest     = new Int8Array(3);
		
		this.globoxmin = vector.create();
		this.globoxmax = vector.create();
	}
	
	move(vel, delta)
	{
		vector.scale(vel, delta, deltavel);
		
		this.updateBox();
		this.rest[0] = 0;
		this.rest[1] = 0;
		this.rest[2] = 0;
		
		let hit = this.world.boxcast(this.globoxmin, this.globoxmax, deltavel);
		
		for(let i = 0; i < 3 && hit; i ++) {
			if(hit.step > 0) {
				this.pos[hit.axis] = hit.pos - this.boxmax[hit.axis];
			}
			else {
				this.pos[hit.axis] = hit.pos - this.boxmin[hit.axis];
			}
			
			this.rest[hit.axis] = hit.step;
			this.vel[hit.axis]  = 0;
			deltavel[hit.axis]  = 0;
			
			this.updateBox();
			
			hit = this.world.boxcast(this.globoxmin, this.globoxmax, deltavel);
		}
		
		vector.add(this.pos, deltavel, this.pos);
	}
	
	updateBox()
	{
		vector.add(this.pos, this.boxmin, this.globoxmin);
		vector.add(this.pos, this.boxmax, this.globoxmax);
	}
}
