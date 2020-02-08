import layout from "./layout.js";

const ctors = {
	byte:   Int8Array,
	ubyte:  Uint8Array,
	short:  Int16Array,
	ushort: Uint16Array,
	float:  Float32Array,
};

const datasizes = {
	byte:   1,
	ubyte:  1,
	short:  2,
	ushort: 2,
	float:  4,
};

export default function buffer(gl, {data, layout = [], index = false, usage = "static", type = "float", divisor = 0})
{
	let buffer = gl.createBuffer();
	
	if(index && type === "float") {
		type = "ushort";
	}
	
	usage = {
		"static": gl.STATIC_DRAW,
		"dynamic": gl.DYNAMIC_DRAW,
		"stream": gl.STREAM_DRAW,
	}[usage];
	
	let target = index ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
	let stride = 0;
	let names = []
	let attribs = {};
	let datasize = datasizes[type];
	
	layout.forEach(field => {
		let [name, count] = field;
		let size = datasize * count;
		let offset = stride;
		names.push(name);
		attribs[name] = offset;
		stride += size;
	});
	
	buffer.usage = usage;
	buffer.target = target;
	buffer.index = index;
	buffer.type = type;
	buffer.divisor = divisor;
	buffer.stride = stride;
	buffer.names = names;
	buffer.attribs = attribs;
	buffer.attrib = attrib.bind(this, buffer);
	buffer.update = update.bind(this, gl, buffer);
	
	if(data) {
		buffer.update(data);
	}
	
	return buffer;
}

export function attrib(buffer, name)
{
	return {
		buffer: buffer,
		type: buffer.type,
		stride: buffer.stride,
		offset: buffer.attribs[name],
		divisor: buffer.divisor,
	};
}

export function update(gl, buffer, data)
{
	if(Array.isArray(data)) {
		let ctor = ctors[buffer.type];
		data = new ctor(data);
	}
	
	gl.bindBuffer(buffer.target, buffer);
	gl.bufferData(buffer.target, data, buffer.usage);
}
