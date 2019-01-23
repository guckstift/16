import {Emitter} from "./Emitter.js";

export class Input extends Emitter
{
	constructor(target)
	{
		super();
		
		this.keymap  = {};
		this.panning = false;
		
		window.onresize = e => {
			this.trigger("resize");
		};
		
		document.onpointerlockchange = e => {
			if(document.pointerLockElement === target) {
				this.panning = true;
			}
			else {
				this.panning = false;
			}
		};
		
		document.onkeydown = e => {
			let key = e.key.toLowerCase();
			
			if(key === " ") {
				key = "space";
			}
			
			if(!this.keymap[key]) {
				this.keymap[key] = true;
				this.trigger("keydown", key);
			}
		};

		document.onkeyup = e => {
			let key = e.key.toLowerCase();
			
			if(key === " ") {
				key = "space";
			}
			
			this.keymap[key] = false;
			this.trigger("keyup", key);
		};

		document.onwheel = e => {
			if(this.panning) {
				if(e.deltaY < 0) {
					this.onWheelUp();
					this.trigger("wheelup");
				}
				else if(e.deltaY > 0) {
					this.trigger("wheeldown");
				}
			}
		};
		
		target.onmousedown = e => {
			if(this.panning) {
				this.trigger("click");
			}
			else {
				target.requestPointerLock();
			}
		};

		target.onmousemove = e => {
			if(this.panning) {
				this.trigger("move", e);
			}
		};
	}
}
