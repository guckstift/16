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
	
	getEyeHeight()
	{
		return this.eyehight;
	}
	
	move(vel, delta)
	{
		vector.scale(vel, delta, deltavel);
		
		this.updateBox();
		this.rest[0] = 0;
		this.rest[1] = 0;
		this.rest[2] = 0;
		
		for(let i = 0; i < 3; i ++) {
			let hit = this.world.boxcast(this.globoxmin, this.globoxmax, deltavel);
			
			if(!hit) {
				break;
			}
			
			if(hit.step > 0) {
				this.pos[hit.axis] = hit.pos - this.boxmax[hit.axis];
			}
			else {
				this.pos[hit.axis] = hit.pos - this.boxmin[hit.axis];
			}
			
			this.setRest(hit.axis, hit.step);
			deltavel[hit.axis] = 0;
			
			this.updateBox();
		}
		
		vector.add(this.pos, deltavel, this.pos);
		this.updateBox();
		this.slopeLiftUpdate();
	}
	
	setRest(axis, dir)
	{
		this.rest[axis] = dir;
		this.vel[axis]  = 0;
	}
	
	updateBox()
	{
		vector.add(this.pos, this.boxmin, this.globoxmin);
		vector.add(this.pos, this.boxmax, this.globoxmax);
	}
	
	slopeLiftUpdate()
	{
		let l  = this.globoxmin[0];
		let r  = this.globoxmax[0];
		let f  = this.globoxmin[2];
		let b  = this.globoxmax[2];
		let vl = Math.floor(l);
		let vr = Math.ceil(r) - 1;
		let vf = Math.floor(f);
		let vb = Math.ceil(b) - 1;
		let g  = this.globoxmin[1];
		let iy = Math.floor(g);
		
		let samples = [
			[l, f, vl, vf],
			[r, f, vr, vf],
			[l, b, vl, vb],
			[r, b, vr, vb],
		];
		
		samples.forEach(([x, z, ix, iz]) => {
			if(this.world.isSolidBlock(ix, iy, iz)) {
				let sl   = this.world.getBlockSlope(ix, iy, iz);
				let miny = 0;
				
				if(sl === 0b1100) {
					miny = iy + z - iz;
				}
				else if(sl === 0b1010) {
					miny = iy + x - ix;
				}
				else if(sl === 0b0011) {
					miny = iy + iz - z + 1;
				}
				else if(sl === 0b0101) {
					miny = iy + ix - x + 1;
				}
				
				else if(sl === 0b0001) {
					miny = Math.min(
						iy + ix - x + 1,
						iy + iz - z + 1,
					);
				}
				else if(sl === 0b0010) {
					miny = Math.min(
						iy + x - ix,
						iy + iz - z + 1,
					);
				}
				else if(sl === 0b0100) {
					miny = Math.min(
						iy + ix - x + 1,
						iy + z - iz,
					);
				}
				else if(sl === 0b1000) {
					miny = Math.min(
						iy + x - ix,
						iy + z - iz,
					);
				}
				
				else if(sl === 0b0111) {
					miny = Math.max(
						iy + ix - x + 1,
						iy + iz - z + 1,
					);
				}
				else if(sl === 0b1011) {
					miny = Math.max(
						iy + x - ix,
						iy + iz - z + 1,
					);
				}
				else if(sl === 0b1101) {
					miny = Math.max(
						iy + ix - x + 1,
						iy + z - iz,
					);
				}
				else if(sl === 0b1110) {
					miny = Math.max(
						iy + x - ix,
						iy + z - iz,
					);
				}
				
				else if(sl === 0b0110) {
					/*miny = Math.max(
						iy + x - ix,
						iy + z - iz,
					);*/
				}
				
				this.pos[1] = Math.max(this.pos[1], miny);
				
				if(this.pos[1] === miny) {
					this.setRest(1, -1);
				}
			}
		});
	}
}
