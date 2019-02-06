import {Emitter} from "./Emitter.js";

export class Input extends Emitter
{
	constructor(target)
	{
		super();
		
		this.onResize     = this.onResize.bind(this);
		this.onLockChange = this.onLockChange.bind(this);
		this.onKeyDown    = this.onKeyDown.bind(this);
		this.onKeyUp      = this.onKeyUp.bind(this);
		this.onMouseDown  = this.onMouseDown.bind(this);
		this.onMouseMove  = this.onMouseMove.bind(this);
		this.keymap       = {};
		this.target       = target;
		this.isLocked     = false;
		
		window.addEventListener("resize", this.onResize);
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		document.addEventListener("pointerlockchange", this.onLockChange);
		target.elm.addEventListener("mousedown", this.onMouseDown);
		target.elm.addEventListener("mousemove", this.onMouseMove);
	}
	
	key(name)
	{
		return this.keymap[name];
	}
	
	lock()
	{
		this.target.elm.requestPointerLock();
	}
	
	unlock()
	{
		document.exitPointerLock();
	}
	
	locked()
	{
		return this.isLocked;
	}
	
	onResize(e)
	{
		this.trigger("resize");
	}
	
	onKeyDown(e)
	{
		let key = e.key.toLowerCase();
		
		if(key === " ") {
			key = "space";
		}
		
		if(!this.keymap[key]) {
			this.keymap[key] = true;
			this.trigger("keydown", key);
		}
	}
	
	onKeyUp(e)
	{
		let key = e.key.toLowerCase();
		
		if(key === " ") {
			key = "space";
		}
		
		this.keymap[key] = false;
		this.trigger("keyup", key);
	}
	
	onLockChange(e)
	{
		if(document.pointerLockElement === this.target.elm) {
			this.isLocked = true;
		}
		else {
			this.isLocked = false;
		}
	}
	
	onMouseDown(e)
	{
		this.trigger("click");
	}
	
	onMouseMove(e)
	{
		this.trigger("move", {moveX: e.movementX, moveY: e.movementY});
	}
}
