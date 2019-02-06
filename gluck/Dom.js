import {Emitter} from "./Emitter.js";

export class Dom extends Emitter
{
	constructor(elm)
	{
		super();
		
		this.elm          = elm;
		this.elm.tabIndex = "0";
	}
	
	getElm()
	{
		return this.elm;
	}
	
	appendTo(elm)
	{
		elm.appendChild(this.elm);
		
		return this;
	}
	
	appendToBody()
	{
		this.appendTo(document.body);
		
		return this;
	}
	
	setCentered()
	{
		this.elm.style.display   = "block";
		this.elm.style.position  = "absolute";
		this.elm.style.left      = "50%";
		this.elm.style.top       = "50%";
		this.elm.style.transform = "translate(-50%, -50%)";
		
		return this;
	}
	
	setTopLeftAligned()
	{
		this.elm.style.display   = "block";
		this.elm.style.position  = "absolute";
		this.elm.style.left      = "0";
		this.elm.style.top       = "0";
		this.elm.style.transform = null;
		
		return this;
	}
}
