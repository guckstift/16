import {Camera} from "../gluck/Camera.js";

export class ShadowMap
{
	constructor(display, sun, scale = 16, resol = 2048)
	{
		this.display  = display;
		this.sun      = sun;
		this.colortex = display.DataTexture(resol, resol, false, false);
		this.depthtex = display.DataTexture(resol, resol, true, true);
		this.camera   = new Camera(false, true);
		this.camera.setProjection(2/scale, 1, -1024, 1024).setPos([0,0,0]);
	}
	
	beginDraw()
	{
		let d = this.sun.getSkyDir();
		
		this.display.renderToTextures(this.colortex, this.depthtex);
		this.camera.setYangle(Math.atan2(d[0], d[2]) + Math.PI);
		this.camera.setXangle(-Math.asin(d[1]));
	}
	
	endDraw()
	{
		this.display.renderToCanvas();
	}
	
	getMatrix()
	{
		return this.camera.getProjView();
	}
	
	getCamera()
	{
		return this.camera;
	}
	
	getDepthTex()
	{
		return this.depthtex;
	}
}
