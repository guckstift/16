import Emitter from "./emitter.js";

export default class Input extends Emitter
{
	constructor(target)
	{
		super();
		
		this.target = target;
		this.lockchange = this.lockchange.bind(this);
		this.keydown = this.keydown.bind(this);
		this.keyup = this.keyup.bind(this);
		this.mousedown = this.mousedown.bind(this);
		this.mousemove = this.mousemove.bind(this);
		this.keymap = {};
		this.locked = false;
		
		document.addEventListener("pointerlockchange", this.lockchange);
		window.addEventListener("keydown", this.keydown);
		window.addEventListener("keyup", this.keyup);
		target.addEventListener("mousedown", this.mousedown);
		target.addEventListener("mousemove", this.mousemove);
	}
	
	lock()
	{
		this.target.requestPointerLock();
	}
	
	lockchange(e)
	{
		if(document.pointerLockElement === this.target) {
			this.locked = true;
		}
		else {
			this.locked = false;
		}
	}
	
	getKey(e)
	{
		let key = e.key.toLowerCase();
		
		if(key === " ") {
			key = "space";
		}
		
		return key;
	}
	
	keydown(e)
	{
		let key = this.getKey(e);
		
		if(!this.keymap[key]) {
			this.keymap[key] = true;
			this.emit("keydown", key);
		}
	}
	
	keyup(e)
	{
		let key = this.getKey(e);
		
		this.keymap[key] = false;
		this.emit("keyup", key);
	}
	
	mousedown(e)
	{
		this.emit("down");
	}
	
	mousemove(e)
	{
		this.emit("move", {movex: e.movementX, movey: e.movementY});
	}
}
