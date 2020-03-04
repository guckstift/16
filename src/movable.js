import vec3 from "./vec3.js";
import {radians} from "./math.js";

const up   = vec3(0, 0,  1);
const down = vec3(0, 0, -1);

export default class Movable
{
	constructor()
	{
		this.pos = vec3();
		this.vel = vec3();
		this.acc = vec3();
		this.ra = 0;
		this.rb = 0;
	}
	
	copyFrom(other)
	{
		this.pos[0] = other.pos[0];
		this.pos[1] = other.pos[1];
		this.pos[2] = other.pos[2];
		this.vel[0] = other.vel[0];
		this.vel[1] = other.vel[1];
		this.vel[2] = other.vel[2];
		this.acc[0] = other.acc[0];
		this.acc[1] = other.acc[1];
		this.acc[2] = other.acc[2];
		this.ra = other.ra;
		this.rb = other.rb;
	}
	
	get x()
	{
		return this.pos[0];
	}
	
	get y()
	{
		return this.pos[1];
	}
	
	get z()
	{
		return this.pos[2];
	}
	
	set x(x)
	{
		this.pos[0] = x;
	}
	
	set y(y)
	{
		this.pos[1] = y;
	}
	
	set z(z)
	{
		this.pos[2] = z;
	}
	
	get lookfwd()
	{
		let v = vec3(0, 1, 0);
		vec3.rotateX(v, radians(this.ra), v);
		vec3.rotateZ(v, radians(this.rb), v);
		return v;
	}
	
	get lookbwd()
	{
		let v = vec3(0, -1, 0);
		vec3.rotateX(v, radians(this.ra), v);
		vec3.rotateZ(v, radians(this.rb), v);
		return v;
	}
	
	get fwd()
	{
		let v = vec3(0, 1, 0);
		vec3.rotateZ(v, radians(this.rb), v);
		return v;
	}
	
	get bwd()
	{
		let v = vec3(0, -1, 0);
		vec3.rotateZ(v, radians(this.rb), v);
		return v;
	}
	
	get rwd()
	{
		let v = vec3(1, 0, 0);
		vec3.rotateZ(v, radians(this.rb), v);
		return v;
	}
	
	get lwd()
	{
		let v = vec3(-1, 0, 0);
		vec3.rotateZ(v, radians(this.rb), v);
		return v;
	}
	
	move(vel, delta)
	{
		vec3.addScaled(this.pos, vel, delta, this.pos);
	}
	
	accel(acc, delta)
	{
		vec3.addScaled(this.vel, acc, delta, this.vel);
	}
	
	update(delta)
	{
		this.accel(this.acc, delta);
		this.move(this.vel, delta);
	}
	
	moveLookfwd(delta)
	{
		this.move(this.lookfwd, delta);
	}
	
	moveLookbwd(delta)
	{
		this.move(this.lookbwd, delta);
	}
	
	moveFwd(delta)
	{
		this.move(this.fwd, delta);
	}
	
	moveBwd(delta)
	{
		this.move(this.bwd, delta);
	}
	
	moveRwd(delta)
	{
		this.move(this.rwd, delta);
	}
	
	moveLwd(delta)
	{
		this.move(this.lwd, delta);
	}
	
	moveUp(delta)
	{
		this.move(up, delta);
	}
	
	moveDown(delta)
	{
		this.move(down, delta);
	}
}
