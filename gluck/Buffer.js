export class Buffer
{
	constructor(display, usage, layout, data = 0)
	{
		let gl = display.gl;
		
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
	
	getSize(field)
	{
		return this.layout.getSize(field);
	}
	
	getOffset(field)
	{
		return this.layout.getOffset(field);
	}
	
	getNames()
	{
		return this.layout.getNames();
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
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		
		if(data.byteLength !== this.size) {
			gl.bufferData(gl.ARRAY_BUFFER, data, this.glusage);
		}
		else {
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
		}
		
		this.data  = data;
		this.size  = data.byteLength;
		this.verts = Math.floor(this.size / this.getStride());
	}
}