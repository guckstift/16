import {radians} from "../gluck/math.js";
import * as vector from "../gluck/vector.js";

export class Sun
{
	constructor(speed = 1, angle = 0)
	{
		this.speed  = speed;
		this.angle  = angle;
		this.phase  = 0;
		this.dir    = vector.create(0,  1, 0);
		this.raydir = vector.create(0, -1, 0);
	}
	
	update(delta)
	{
		this.phase += delta * this.speed;
		vector.create(0, 1, 0, this.dir);
		vector.rotateZ(this.dir, radians(this.phase), this.dir);
		vector.rotateX(this.dir, radians(this.angle), this.dir);
		vector.rotateY(this.dir, radians(45), this.dir);
	}
	
	getSkyDir()
	{
		return this.dir;
	}
	
	getRayDir()
	{
		return vector.scale(this.dir, -1, this.raydir);
	}
}
