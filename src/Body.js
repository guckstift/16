import * as vector from "./vector.js";
import {radians} from "./math.js";

let deltavel = vector.create();

export class Body
{
	constructor()
	{
		this.pos    = vector.create();
		this.vel    = vector.create();
		this.acc    = vector.create();
		this.xangle = 0;
		this.yangle = 0;
		
		this.lookForwardDirty  = true;
		this.lookBackwardDirty = true;
		this.forwardDirty      = true;
		this.backwardDirty     = true;
		this.rightwardDirty    = true;
		this.leftwardDirty     = true;
		
		this.lookForward  = vector.create();
		this.lookBackward = vector.create();
		this.forward      = vector.create();
		this.backward     = vector.create();
		this.rightward    = vector.create();
		this.leftward     = vector.create();
	}
	
	setXangle(xangle)
	{
		this.xangle            = xangle;
		this.lookForwardDirty  = true;
		this.lookBackwardDirty = true;
		this.forwardDirty      = true;
		this.backwardDirty     = true;
		this.rightwardDirty    = true;
		this.leftwardDirty     = true;
	}
	
	setYangle(yangle)
	{
		this.yangle            = yangle;
		this.lookForwardDirty  = true;
		this.lookBackwardDirty = true;
		this.forwardDirty      = true;
		this.backwardDirty     = true;
		this.rightwardDirty    = true;
		this.leftwardDirty     = true;
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
	
	update(delta)
	{
		this.accelerate(this.acc, delta);
		this.move(this.vel, delta);
	}
	
	accelerate(acc, delta)
	{
		vector.addScaled(this.vel, acc, delta, this.vel);
	}
	
	move(vel, delta)
	{
		vector.scale(vel, delta, this.deltavel);
		
		vector.addScaled(this.pos, vel, delta, this.pos);
	}
	
	moveLookForward(delta)
	{
		this.move(this.getLookForward(), delta);
	}
	
	moveLookBackward(delta)
	{
		this.move(this.getLookBackward(), delta);
	}
	
	moveForward(delta)
	{
		this.move(this.getForward(), delta);
	}
	
	moveRightward(delta)
	{
		this.move(this.getRightward(), delta);
	}
	
	moveLeftward(delta)
	{
		this.move(this.getLeftward(), delta);
	}
	
	moveUpward(delta)
	{
		this.move([0, 1, 0], delta);
	}
	
	moveDownward(delta)
	{
		this.move([0, -1, 0], delta);
	}
	
	getLookForward()
	{
		if(this.lookForwardDirty) {
			vector.create(0, 0, 1, this.lookForward);
			vector.rotateX(this.lookForward, -this.xangle, this.lookForward);
			vector.rotateY(this.lookForward, -this.yangle, this.lookForward);
			this.lookatDirty = false;
		}
		
		return this.lookForward;
	}
	
	getLookBackward()
	{
		if(this.lookBackwardDirty) {
			vector.create(0, 0, -1, this.lookBackward);
			vector.rotateX(this.lookBackward, -this.xangle, this.lookBackward);
			vector.rotateY(this.lookBackward, -this.yangle, this.lookBackward);
			this.lookatDirty = false;
		}
		
		return this.lookBackward;
	}
	
	getForward()
	{
		if(this.forwardDirty) {
			vector.create(0, 0, 1, this.forward);
			vector.rotateY(this.forward, -this.yangle, this.forward);
			this.forwardDirty = false;
		}
		
		return this.forward;
	}
	
	getRightward()
	{
		if(this.rightwardDirty) {
			vector.create(0, 0, 1, this.rightward);
			vector.rotateY(this.rightward, -this.yangle - Math.PI * 0.5, this.rightward);
			this.rightwardDirty = false;
		}
		
		return this.rightward;
	}
	
	getLeftward()
	{
		if(this.leftwardDirty) {
			vector.create(0, 0, 1, this.leftward);
			vector.rotateY(this.leftward, -this.yangle + Math.PI * 0.5, this.leftward);
			this.leftwardDirty = false;
		}
		
		return this.leftward;
	}
	
	turnXangle(xangle)
	{
		let curangle = this.xangle;
		
		curangle += xangle;
		
		if(curangle < radians(-90)) {
			curangle = radians(-90);
		}
		else if(curangle > radians(90)) {
			curangle = radians(90);
		}
		
		this.setXangle(curangle);
	}
	
	turnYangle(yangle)
	{
		this.setYangle(this.yangle + yangle);
	}
}
