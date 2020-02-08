import layout from "./layout.js";

export default function buffer(gl, index, usage, type, sizeOrData)
{
	let buffer = gl.createBuffer();
	
	if(index !== "index") {
		[index, usage, type, sizeOrData] = [false, index, usage, type];
	}
	
	if(!["static", "dynamic", "stream"].includes(usage)) {
		[usage, type, sizeOrData] = ["static", usage, type];
	}
	
	if(typeof type !== "string") {
		[type, sizeOrData] = [index ? "ushort" : "float", type];
	}
	
	usage = {
		"static": gl.STATIC_DRAW,
		"dynamic": gl.DYNAMIC_DRAW,
		"stream": gl.STREAM_DRAW,
	}[usage];
	
	if(Array.isArray(sizeOrData)) {
		let ctor = type === "float"  ? Float32Array :
		           type === "byte"   ? Int8Array :
		           type === "short"  ? Int16Array :
		           type === "ubyte"  ? Uint8Array :
		           type === "ushort" ? Uint16Array :
		           Float32Array;
		
		sizeOrData = new ctor(sizeOrData);
	}
	
	if(sizeOrData) {
		let target = index ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
		gl.bindBuffer(target, buffer);
		gl.bufferData(target, sizeOrData, usage);
	}
	
	buffer.layout = (...args) => layout(buffer, ...args);
	
	return buffer;
}
