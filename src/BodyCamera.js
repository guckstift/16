import {Camera} from "../gluck/Camera.js";

export class BodyCamera extends Camera
{
	constructor(body)
	{
		super();
		
		this.body = body;
	}
	
	update()
	{
		this.setFromMovable(this.body);
		this.pos[1] += this.body.getEyeHeight();
	}
}
