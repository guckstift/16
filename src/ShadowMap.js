import {Camera} from "../gluck/Camera.js";

export class ShadowMap
{
	constructor(display, sun)
	{
		this.display  = display;
		this.colortex = display.DataTexture(2048, 2048, false);
		this.depthtex = display.DataTexture(2048, 2048, true);
		this.camera   = new Camera(false, true);
	}
	
	beginDraw()
	{
		this.display.renderToTextures(this.colortex, this.depthtex);
	}
	
	endDraw()
	{
		this.display.renderToCanvas();
	}
}
