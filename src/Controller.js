export class Controller
{
	constructor(body, input)
	{
		this.body  = body;
		this.input = input;
		
		input.on("click", e => {
			input.lock();
		});
		
		input.on("move", e => {
			if(input.locked()) {
				body.turnYangle(+e.moveX / 128);
				body.turnXangle(-e.moveY / 128);
			}
		});
	}
	
	update(runspeed, jumpspeed, delta)
	{
		let body     = this.body;
		let input    = this.input;
		let rundelta = runspeed * delta;
		
		if(input.key("space") && body.rest[1] === -1) {
			body.accelerate([0, jumpspeed, 0], 1);
		}
		if(input.key("w")) {
			body.moveForward(rundelta);
		}
		if(input.key("s")) {
			body.moveBackward(rundelta);
		}
		if(input.key("d")) {
			body.moveRightward(rundelta);
		}
		if(input.key("a")) {
			body.moveLeftward(rundelta);
		}
		if(input.key("shift")) {
			body.moveDownward(delta);
		}
	}
}
