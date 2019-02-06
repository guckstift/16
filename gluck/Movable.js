import * as vector from "./vector.js";
import {radians} from "./math.js";

let deltavel = vector.create();

export class Movable
{
	constructor()
	{
		this.pos      = vector.create64();
		this.vel      = vector.create();
		this.acc      = vector.create();
		this.xangle   = 0;
		this.yangle   = 0;
		
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
		
		return this;
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
		
		return this;
	}
	
	setAngle(xangle, yangle)
	{
		this.setXangle(xangle);
		this.setYangle(yangle);
		
		return this;
	}
	
	setPos(pos)
	{
		vector.copy(pos, this.pos);
		
		return this;
	}
	
	setVel(vel)
	{
		vector.copy(vel, this.vel);
		
		return this;
	}
	
	setAcc(acc)
	{
		vector.copy(acc, this.acc);
		
		return this;
	}
	
	update(delta)
	{
		this.accelerate(this.acc, delta);
		this.move(this.vel, delta);
		
		return this;
	}
	
	accelerate(acc, delta)
	{
		vector.addScaled(this.vel, acc, delta, this.vel);
		
		return this;
	}
	
	move(vel, delta)
	{
		vector.addScaled(this.pos, vel, delta, this.pos);
		
		return this;
	}
	
	moveLookForward(delta)
	{
		this.move(this.getLookForward(), delta);
		
		return this;
	}
	
	moveLookBackward(delta)
	{
		this.move(this.getLookBackward(), delta);
		
		return this;
	}
	
	moveForward(delta)
	{
		this.move(this.getForward(), delta);
		
		return this;
	}
	
	moveBackward(delta)
	{
		this.move(this.getBackward(), delta);
		
		return this;
	}
	
	moveRightward(delta)
	{
		this.move(this.getRightward(), delta);
		
		return this;
	}
	
	moveLeftward(delta)
	{
		this.move(this.getLeftward(), delta);
		
		return this;
	}
	
	moveUpward(delta)
	{
		this.move([0, 1, 0], delta);
		
		return this;
	}
	
	moveDownward(delta)
	{
		this.move([0, -1, 0], delta);
		
		return this;
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
	
	getBackward()
	{
		if(this.backwardDirty) {
			vector.create(0, 0, -1, this.backward);
			vector.rotateY(this.backward, -this.yangle, this.backward);
			this.backwardDirty = false;
		}
		
		return this.backward;
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
		
		return this;
	}
	
	turnYangle(yangle)
	{
		this.setYangle(this.yangle + yangle);
		
		return this;
	}
}
