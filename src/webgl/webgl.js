import shader from "./shader.js";
import buffer from "./buffer.js";
import texture from "./texture.js";

const flags = [
	"alpha",
	"depth",
	"stencil",
	"antialias",
	"premultipliedAlpha",
	"preserveDrawingBuffer",
	"failIfMajorPerformanceCaveat",
	"desynchronized",
];

export default function webgl(width, height, canvas, ...opts)
{
	if(typeof canvas === "string") {
		opts.unshift(canvas);
		canvas = document.querySelector(canvas);
	}
	
	if(!canvas) {
		canvas = document.createElement("canvas");
	}
	
	if(typeof width !== "number") {
		if(typeof height === "string") {
			opts.unshift(height);
		}
		
		if(typeof width === "string") {
			opts.unshift(width);
		}
		
		width = canvas.width;
		height = canvas.height;
	}
	
	let fullPage = opts.includes("fullPage");
	let appendToBody = opts.includes("appendToBody");
	let autosize = opts.includes("autosize");
	let attribs = {};
	
	opts.forEach(opt => {
		if(flags.includes(opt)) {
			attribs[opt] = true;
		}
		else if(opt.startsWith("no-") && flags.includes(opt.slice(3))) {
			attribs[opt.slice(3)] = false;
		}
		else if(opt === "highPerformance") {
			attribs.powerPreference = "high-performance";
		}
		else if(opt === "lowPower") {
			attribs.powerPreference = "low-power";
		}
	});
	
	canvas.width = width;
	canvas.height = height;
	let gl = canvas.getContext("webgl", attribs);
	gl = gl || canvas.getContext("experimental-webgl", attribs);
	gl.viewport(0, 0, width, height);
	
	if(fullPage) {
		enableFullPage(gl);
	}
	
	if(appendToBody) {
		document.body.appendChild(canvas);
	}
	
	if(autosize) {
		enableAutosize(gl);
	}
	
	gl.shader = (...args) => shader(gl, ...args);
	gl.buffer = (...args) => buffer(gl, ...args);
	gl.texture = (...args) => texture(gl, ...args);
	gl.indices = (...args) => buffer(gl, "index", ...args);
	gl.aspect = () => aspect(gl);
	gl.resize = (...args) => resize(gl, ...args);
	gl.enableFullPage = () => enableFullPage(gl);
	gl.adjustViewport = () => adjustViewport(gl);
	gl.enableAutosize = () => enableAutosize(gl);
	gl.disableBlending = () => disableBlending(gl);
	gl.disableAutosize = () => disableAutosize(gl);
	gl.enableAlphaBlending = () => enableAlphaBlending(gl);
	gl.resizeToDisplaySize = () => resizeToDisplaySize(gl);
	
	return gl;
}

export function aspect(gl)
{
	return gl.canvas.clientWidth / gl.canvas.clientHeight;
}

export function adjustViewport(gl)
{
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	return gl;
}

export function resize(gl, w, h)
{
	gl.canvas.width = w;
	gl.canvas.height = h;
	adjustViewport(gl);
	return gl;
}

export function resizeToDisplaySize(gl)
{
	let w = gl.canvas.clientWidth;
	let h = gl.canvas.clientHeight;
	
	if(gl.canvas.width !== w || gl.canvas.height !== h) {
		resize(gl, w, h);
	}
	
	return gl;
}

export function enableAlphaBlending(gl)
{
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	return gl;
}

export function disableBlending(gl)
{
	gl.disable(gl.BLEND);
	return gl;
}

export function enableFullPage(gl)
{
	gl.canvas.style.position = "absolute";
	gl.canvas.style.left = "0";
	gl.canvas.style.top = "0";
	gl.canvas.style.width = "100vw";
	gl.canvas.style.height= "100vh";
	return gl;
}

export function enableAutosize(gl)
{
	if(!gl.autosizeLoop) {
		gl.autosizeLoop = requestAnimationFrame(function loop() {
			gl.autosizeLoop = requestAnimationFrame(loop);
			resizeToDisplaySize(gl);
		});
	}
}

export function disableAutosize(gl)
{
	if(gl.autosizeLoop) {
		cancelAnimationFrame(gl.autosizeLoop);
		delete gl.autosizeLoop;
	}
}
