export class Shader
{
	constructor(display, vertSrc, fragSrc)
	{
		let gl   = display.gl;
		let vert = gl.createShader(gl.VERTEX_SHADER);
		let frag = gl.createShader(gl.FRAGMENT_SHADER);
		let prog = gl.createProgram();

		gl.shaderSource(vert, "precision highp float;\n\n" + vertSrc);
		gl.shaderSource(frag, "precision highp float;\n\n" + fragSrc);

		gl.compileShader(vert);
		gl.compileShader(frag);
		gl.attachShader(prog, vert);
		gl.attachShader(prog, frag);

		gl.linkProgram(prog);
		
		if(gl.getShaderParameter(vert, gl.COMPILE_STATUS) === false) {
			throw "error compile vertex shader: " + gl.getShaderInfoLog(vert);
		}
		
		if(gl.getShaderParameter(frag, gl.COMPILE_STATUS) === false) {
			throw "error compile fragment shader: " + gl.getShaderInfoLog(frag);
		}
		
		if(gl.getProgramParameter(prog, gl.LINK_STATUS) === false) {
			throw "error link program: " + gl.getProgramInfoLog(prog);
		}
		
		this.gl      = gl;
		this.prog    = prog;
		this.vars    = {};
		this.texunit = 0;
		this.verts   = 2**32 - 1;
	}
	
	use()
	{
		this.gl.useProgram(this.prog);
		this.texunit = 0;
		this.verts   = 2**32 - 1;
	}
	
	getVar(name)
	{
		if(!this.vars[name]) {
			let loca = this.gl.getAttribLocation(this.prog, name);
			
			if(loca === -1) {
				loca = this.gl.getUniformLocation(this.prog, name);
			}
			
			if(loca !== -1 && loca !== null) {
				this.vars[name] = loca;
			}
		}
		
		return this.vars[name];
	}
	
	attrib(name, buffer, field)
	{
		let gl   = this.gl;
		let loca = this.getVar(name);
		
		field = field || name;
		
		if(loca !== undefined) {
			gl.enableVertexAttribArray(loca);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer.getBuf());
			
			gl.vertexAttribPointer(
				loca,
				buffer.getSize(field),
				buffer.getType(),
				false,
				buffer.getStride(),
				buffer.getOffset(field)
			);
			
			this.verts = Math.min(this.verts, buffer.getVerts());
		}
	}
	
	buffer(buffer)
	{
		buffer.getNames().forEach(name => {
			this.attrib(name, buffer);
		});
	}
	
	uniform(name, value)
	{
		if(value.length === 1) {
			this.gl.uniform1f(this.getVar(name), value);
		}
		else if(value.length === 2) {
			this.gl.uniform2fv(this.getVar(name), value);
		}
		else if(value.length === 3) {
			this.gl.uniform3fv(this.getVar(name), value);
		}
		else if(value.length === 4) {
			this.gl.uniform4fv(this.getVar(name), value);
		}
		else if(value.length === 9) {
			this.gl.uniformMatrix3fv(this.getVar(name), false, value);
		}
		else if(value.length === 16) {
			this.gl.uniformMatrix4fv(this.getVar(name), false, value);
		}
	}
	
	texture(name, tex)
	{
		let gl = this.gl;
	
		gl.activeTexture(gl.TEXTURE0 + this.texunit);
		gl.bindTexture(gl.TEXTURE_2D, tex.tex);
		gl.uniform1i(this.getVar(name), this.texunit);
		
		this.texunit++;
	}
	
	triangles()
	{
		let gl = this.gl;
		
		gl.drawArrays(gl.TRIANGLES, 0, this.verts);
	}
}