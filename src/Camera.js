import * as matrix from "./matrix.js";
import * as vector from "./vector.js";
import {radians} from "./math.js";

let nullVector = vector.create64();

export class Camera
{
	constructor()
	{
		this.fovy      = 90;
		this.aspect    = 1;
		this.near      = 0.125;
		this.far       = 1024;
		this.xangle    = 0;
		this.yangle    = 0;
		this.pos       = vector.create64();
		this.projDirty = true;
		this.rotaDirty = false;
		this.matrix    = matrix.identity();
		this.proj      = matrix.identity();
		this.viewmodel = matrix.identity();
		this.rota      = matrix.identity();
	}
	
	setFovy(fovy)
	{
		this.fovy      = fovy;
		this.projDirty = true;
	}
	
	setAspect(aspect)
	{
		this.aspect    = aspect;
		this.projDirty = true;
	}
	
	setNear(near)
	{
		this.near      = near;
		this.projDirty = true;
	}
	
	setFar(far)
	{
		this.far       = far;
		this.projDirty = true;
	}
	
	setProjection(fovy, aspect, near, far)
	{
		this.setFovy(fovy);
		this.setAspect(aspect);
		this.setNear(near);
		this.setFar(far);
	}
	
	setXangle(xangle)
	{
		this.xangle    = xangle;
		this.rotaDirty = true;
	}
	
	setYangle(yangle)
	{
		this.yangle    = yangle;
		this.rotaDirty = true;
	}
	
	setAngle(xangle, yangle)
	{
		this.setXangle(xangle);
		this.setYangle(yangle);
	}
	
	setPos(pos)
	{
		vector.copy(pos, this.pos);
	}
	
	setFromBody(body)
	{
		this.setPos(body.pos);
		this.setAngle(body.xangle, body.yangle);
	}
	
	getMatrix(pos = nullVector, ax = 0, ay = 0, az = 0)
	{
		matrix.multiply(this.getProjection(), this.getViewModel(pos, ax, ay, az), this.matrix);
		
		return this.matrix;
	}
	
	getProjection()
	{
		if(this.projDirty) {
			matrix.perspective(radians(this.fovy), this.aspect, this.near, this.far, this.proj);
			this.projDirty = false;
		}
		
		return this.proj;
	}
	
	getViewModel(pos = nullVector, ax = 0, ay = 0, az = 0)
	{
		matrix.translate(
			this.getRota(),
			pos[0] - this.pos[0],
			pos[1] - this.pos[1],
			pos[2] - this.pos[2],
			this.viewmodel
		);
		
		if(ax) {
			matrix.rotateX(this.viewmodel, ax, this.viewmodel);
		}
		
		if(ay) {
			matrix.rotateY(this.viewmodel, ay, this.viewmodel);
		}
		
		if(az) {
			matrix.rotateZ(this.viewmodel, az, this.viewmodel);
		}
		
		return this.viewmodel;
	}
	
	getRota()
	{
		if(this.rotaDirty) {
			matrix.identity(this.rota);
			matrix.rotateX(this.rota, this.xangle, this.rota);
			matrix.rotateY(this.rota, this.yangle, this.rota);
			this.rotaDirty = false;
		}
		
		return this.rota;
	}
}
