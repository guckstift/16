import {VertexLayout} from "./VertexLayout.js";

export class Buffer
{
	constructor(display, usage, layout, data = 0)
	{
		let gl = display.gl;
		
		this.target = gl.ARRAY_BUFFER;
		
		if(layout === "index") {
			layout = indexLayout;
			this.target = gl.ELEMENT_ARRAY_BUFFER;
		}
		
		this.gl        = gl;
		this.buf       = gl.createBuffer();
		this.layout    = layout;
		this.arraytype = layout.getArrayType();
		
		this.glusage = {
			"static":  gl.STATIC_DRAW,
			"dynamic": gl.DYNAMIC_DRAW,
			"stream":  gl.STREAM_DRAW
		}[usage];
		
		this.gltype = {
			"byte":   gl.BYTE,
			"short":  gl.SHORT,
			"ubyte":  gl.UNSIGNED_BYTE,
			"ushort": gl.UNSIGNED_SHORT,
			"float":  gl.FLOAT,
		}[layout.getType()];
		
		this.update(data);
	}
	
	getBuf()
	{
		return this.buf;
	}
	
	getType()
	{
		return this.gltype;
	}
	
	getData()
	{
		return this.data;
	}
	
	getVerts()
	{
		return this.verts;
	}
	
	getStride()
	{
		return this.layout.getStride();
	}
	
	getFieldSize(field)
	{
		return this.layout.getFieldSize(field);
	}
	
	getOffset(field)
	{
		return this.layout.getOffset(field);
	}
	
	getNames()
	{
		return this.layout.getNames();
	}
	
	getSize()
	{
		return this.size;
	}
	
	update(data)
	{
		let gl = this.gl;
		
		if(Array.isArray(data) || typeof data === "number") {
			data = new this.arraytype(data);
		}
		else if(!data) {
			data = this.data;
		}
		
		gl.bindBuffer(this.target, this.buf);
		
		if(data.byteLength !== this.size) {
			gl.bufferData(this.target, data, this.glusage);
		}
		else {
			gl.bufferSubData(this.target, 0, data);
		}
		
		this.data  = data;
		this.size  = data.byteLength;
		this.verts = Math.floor(this.size / this.getStride());
	}
}

let indexLayout = new VertexLayout("ushort", ["index", 1]);
