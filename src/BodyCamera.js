import {Camera} from "../gluck/Camera.js";

export class BodyCamera extends Camera
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
