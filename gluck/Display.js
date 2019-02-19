import {Dom} from "./Dom.js";
import {Shader} from "./Shader.js";
import {Buffer} from "./Buffer.js";
import {Texture} from "./Texture.js";
import {DataTexture} from "./DataTexture.js";

export class Display extends Dom
{
	constructor()
	{
		let canvas = document.createElement("canvas");
		let gl     = canvas.getContext("webgl", {alpha: false, antialias: false});
		
		super(canvas);
		
		canvas.style.display = "block";
		
		gl.enable(gl.BLEND);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
		this.texcache    = {};
		this.shadercache = {};
		this.canvas      = canvas;
		this.gl          = gl;
		this.gldt        = gl.getExtension("WEBGL_depth_texture");
		this.glia        = gl.getExtension("ANGLE_instanced_arrays");
		this.frame       = this.frame.bind(this);
		this.defaultTex  = gl.createTexture();
		this.framebuf    = gl.createFramebuffer();
		this.last        = 0;
		this.delta       = 0;
		this.frameAccu   = 0;
		this.timeAccu    = 0;
		this.fps         = 0;

		gl.bindTexture(gl.TEXTURE_2D, this.defaultTex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		
		this.resize(800, 600);
		
		requestAnimationFrame(this.frame);
	}
	
	getAspect()
	{
		return this.canvas.width / this.canvas.height;
	}
	
	frame(now)
	{
		this.last  = this.last || now;
		this.delta = (now - this.last) / 1000;
		this.last  = now;
		this.trigger("frame", {delta: this.delta});
		requestAnimationFrame(this.frame);
		
		this.frameAccu ++;
		this.timeAccu += this.delta;
		
		if(this.timeAccu >= 1) {
			this.fps       = this.frameAccu;
			console.log(this.fps);
			this.timeAccu -= 1;
			this.frameAccu = 0;
		}
	}
	
	resize(w, h)
	{
		this.canvas.width  = w;
		this.canvas.height = h;
		this.gl.viewport(0, 0, w, h);
	}
	
	resizeToPage()
	{
		this.resize(window.innerWidth, window.innerHeight);
	}
	
	renderToTextures(colorTex, depthTex)
	{
		let gl = this.gl;
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuf);
		
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex.tex, 0
		);
		
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex.tex, 0
		);
		
		gl.viewport(0, 0, colorTex.width, colorTex.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}
	
	renderToCanvas()
	{
		let gl = this.gl;
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	}
	
	getTexture(url)
	{
		if(!this.texcache[url]) {
			this.texcache[url] = this.Texture(url);
		}
		
		return this.texcache[url];
	}
	
	getShader(id, vertSrc, fragSrc)
	{
		if(!this.shadercache[id]) {
			this.shadercache[id] = this.Shader(vertSrc, fragSrc);
		}
		
		return this.shadercache[id];
	}
	
	Shader(vertSrc, fragSrc)
	{
		return new Shader(this, vertSrc, fragSrc);
	}
	
	Buffer(usage, layout, data)
	{
		return new Buffer(this, usage, layout, data);
	}
	
	Texture(url)
	{
		return new Texture(this, url);
	}
	
	DataTexture(width, height, isdepth = false)
	{
		return new DataTexture(this, width, height, isdepth);
	}
}
