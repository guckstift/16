export class Buffer
{
	constructor(display, dynamic, byte)
	{
		let gl = display.gl;
		
		this.gl      = gl;
		this.dynamic = dynamic;
		this.byte    = byte;
		this.buf     = gl.createBuffer();
	}
	
	setData(data)
	{
		let gl = this.gl;
		
		if(Array.isArray(data)) {
			if(this.byte) {
				data = new Uint8Array(data);
			}
			else {
				data = new Float32Array(data);
			}
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		gl.bufferData(gl.ARRAY_BUFFER, data, this.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
	}
}
