import {Emitter} from "./Emitter.js";

export class Dom extends Emitter
{
	constructor(elm)
	{
		super();
		
		this.elm = elm;
	}
	
	appendTo(elm)
	{
		elm.appendChild(this.elm);
	}
	
	appendToBody()
	{
		this.appendTo(document.body);
	}
	
	setCentered()
	{
		this.elm.style.display   = "block";
		this.elm.style.position  = "absolute";
		this.elm.style.left      = "50%";
		this.elm.style.top       = "50%";
		this.elm.style.transform = "translate(-50%, -50%)";
	}
}
