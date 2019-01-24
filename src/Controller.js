export class Controller
{
	constructor(body, input)
	{
		this.body  = body;
		this.input = input;
	}
	
	update(camera, delta)
	{
		let body  = this.body;
		let input = this.input;
		
		if(input.keymap.w) {
			body.moveLookForward(delta);
			camera.setFromBody(body);
		}
		if(input.keymap.s) {
			body.moveLookBackward(delta);
			camera.setFromBody(body);
		}
		if(input.keymap.d) {
			body.moveRightward(delta);
			camera.setFromBody(body);
		}
		if(input.keymap.a) {
			body.moveLeftward(delta);
			camera.setFromBody(body);
		}
		if(input.keymap.shift) {
			body.moveDownward(delta);
			camera.setFromBody(body);
		}
		if(input.keymap.space) {
			body.moveUpward(delta);
			camera.setFromBody(body);
		}
	}
	
	pan(camera, moveX, moveY)
	{
		let body = this.body;
		
		body.turnYangle(+moveX / 100);
		body.turnXangle(-moveY / 100);
		camera.setFromBody(body);
	}
}
