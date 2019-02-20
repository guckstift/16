export class DataTexture
{
	constructor(display, width, height, isdepth = false, smooth = false)
	{
		let gl  = display.gl;
		let tex = gl.createTexture();
		
		gl.bindTexture(gl.TEXTURE_2D, tex);
		
		if(smooth) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
		else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		}
		
		if(isdepth) {
			gl.texImage2D(
				gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT,
				gl.UNSIGNED_SHORT, null
			);
		}
		else {
			gl.texImage2D(
				gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null
			);
		}
		
		this.gl      = gl;
		this.tex     = tex;
		this.isdepth = isdepth;
		this.width   = width;
		this.height  = height;
	}
	
	bind()
	{
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex);
	}
}
