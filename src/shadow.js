import OrthoCamera from "./orthocamera.js";
import {degrees} from "./math.js";

export default class Shadow
{
	constructor(gl, scale = 16, resol = 2048, throttle = 1, depth = 1024)
	{
		this.gl = gl;
		this.scale = scale;
		this.resol = resol;
		this.depth = depth;
		this.throttle = throttle;
		this.colortex = gl.texture(resol, resol, "nearest", null, "rgba");
		this.depthtex = gl.texture(resol, resol, "linear", null, "depth");
		this.framebuf = gl.createFramebuffer();
		this.camera   = new OrthoCamera(2 / scale, 1, -depth, depth);
	}
	
	update(cam, sky)
	{
		this.camera.x = cam.x;
		this.camera.y = cam.y;
		this.camera.z = cam.z;
		this.camera.ra = degrees(Math.acos(sky.sun[2]));
		this.camera.rb = degrees(-Math.atan2(sky.sun[0], sky.sun[1]) - Math.PI);
	}
	
	begin()
	{
		let gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuf);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colortex, 0);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthtex, 0);
		gl.viewport(0, 0, this.resol, this.resol);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}
	
	end()
	{
		let gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.adjustViewport();
	}
}
