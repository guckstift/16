import {Camera} from "../gluck/Camera.js";

export class ShadowMap
{
	constructor(display, sun)
	{
		this.display  = display;
		this.sun      = sun;
		this.colortex = display.DataTexture(2048, 2048, false);
		this.depthtex = display.DataTexture(2048, 2048, true);
		this.camera   = new Camera(false, true);
		this.camera.setProjection(2/444, display.getAspect(), -1024, 1024).setPos([128,128,128]);
	}
	
	beginDraw()
	{
		this.display.renderToTextures(this.colortex, this.depthtex);
		let d = this.sun.getSkyDir();
		this.camera.setAspect(this.display.getAspect());
		this.camera.setYangle(Math.atan2(d[0], d[2]) + Math.PI);
		this.camera.setXangle(-Math.asin(d[1]));
	}
	
	endDraw()
	{
		this.display.renderToCanvas();
	}
}
