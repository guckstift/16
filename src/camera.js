import Movable from "./movable.js";
import mat4 from "./mat4.js";
import {radians} from "./math.js";

export default class Camera extends Movable
{
	constructor(fovy = 90, aspect = 1, near = 0.1, far = 1000)
	{
		super();
		
		this.aspect = aspect;
		this.fovy = fovy;
		this.near = near;
		this.far = far;
	}
	
	copyFromBody(body)
	{
		this.copyFrom(body);
		this.pos[2] += body.eyehight;
	}
	
	get proj()
	{
		return mat4.perspective(radians(this.fovy), this.aspect, this.near, this.far, true);
	}
	
	get view()
	{
		let m = mat4.identity();
		mat4.rotateX(m, -radians(this.ra), m);
		mat4.rotateZ(m, -radians(this.rb), m);
		mat4.translate(m, -this.pos[0], -this.pos[1], -this.pos[2], m);
		return m;
	}
	
	get mat()
	{
		return mat4.multiply(this.proj, this.view);
	}
	
	get model()
	{
		let m = mat4.identity();
		mat4.translate(m, this.pos[0], this.pos[1], this.pos[2], m);
		return m;
	}
}
