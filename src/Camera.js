import {Perspective} from "../gluck/Perspective.js";

export class Camera extends Perspective
{
	constructor()
	{
		super();
	}
	
	setFromBody(body)
	{
		this.setPos(body.pos);
		this.pos[1] += body.eyehight;
		this.setAngle(body.xangle, body.yangle);
	}
}
