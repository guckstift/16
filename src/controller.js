let runspeed  = 8;
let jumpspeed = 7.915;

export default class Controller
{
	constructor(body, input)
	{
		this.body = body;
		this.input = input;
		
		input.on(this, "down", () => {
			input.lock();
		});
		
		input.on(this, "move", e => {
			if(input.locked) {
				body.ra += -e.movey;
				body.rb += -e.movex;
			}
		});
	}
	
	update(delta)
	{
		let body     = this.body;
		let input    = this.input;
		let rundelta = runspeed * delta;
		
		if(input.keymap.space && body.rest[2] === -1) {
			body.accel([0, 0, jumpspeed], 1);
		}
		if(input.keymap.w) {
			body.moveFwd(rundelta);
		}
		if(input.keymap.s) {
			body.moveBwd(rundelta);
		}
		if(input.keymap.d) {
			body.moveRwd(rundelta);
		}
		if(input.keymap.a) {
			body.moveLwd(rundelta);
		}
		if(input.keymap.shift) {
			body.moveDown(delta * runspeed);
		}
		if(input.keymap.space) {
			body.moveUp(delta * runspeed);
		}
	}
}
