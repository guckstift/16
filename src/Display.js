import {Dom} from "./Dom.js";
import {Shader} from "./Shader.js";
import {Buffer} from "./Buffer.js";
import {Texture} from "./Texture.js";

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
		this.frame       = this.frame.bind(this);
		this.defaultTex  = gl.createTexture();

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
	
	frame()
	{
		this.trigger("frame");
		requestAnimationFrame(this.frame);
	}
	
	resize(w, h)
	{
		this.canvas.width = w;
		this.canvas.height = h;
		this.gl.viewport(0, 0, w, h);
	}
	
	resizeToPage()
	{
		this.resize(window.innerWidth, window.innerHeight);
		this.canvas.style.position = "absolute";
		this.canvas.style.left = "0";
		this.canvas.style.top = "0";
	}
	
	getTexture(url)
	{
		if(!this.texcache[url]) {
			this.texcache[url] = this.createTexture(url);
		}
		
		return this.texcache[url];
	}
	
	getShader(id, vertSrc, fragSrc)
	{
		if(!this.shadercache[id]) {
			this.shadercache[id] = this.createShader(vertSrc, fragSrc);
		}
		
		return this.shadercache[id];
	}
	
	createShader(vertSrc, fragSrc)
	{
		return new Shader(this, vertSrc, fragSrc);
	}
	
	createBuffer(dynamic, byte)
	{
		return new Buffer(this, dynamic, byte);
	}
	
	createTexture(url)
	{
		return new Texture(this, url);
	}
	
	draw(vertnum)
	{
		let gl = this.gl;
		
		gl.drawArrays(gl.TRIANGLES, 0, vertnum);
	}
}
