export class Shader
{
	constructor(display, vertSrc, fragSrc, opts = {})
	{
		let gl    = display.gl;
		let vert  = gl.createShader(gl.VERTEX_SHADER);
		let frag  = gl.createShader(gl.FRAGMENT_SHADER);
		let prog  = gl.createProgram();
		let regex = null;
		
		for(let prop in opts) {
			let val = opts[prop];
			
			if(typeof val === "boolean") {
				if(val) {
					regex = new RegExp("(<" + prop + ">)|(</" + prop + ">)", "g");
				}
				else {
					regex = new RegExp("<" + prop + ">(.|\\s)*?</" + prop + ">", "gm");
				}
				
				vertSrc = vertSrc.replace(regex, "");
				fragSrc = fragSrc.replace(regex, "");
			}
			else {
				regex   = new RegExp("<" + prop + ">", "g");
				vertSrc = vertSrc.replace(regex, val);
				fragSrc = fragSrc.replace(regex, val);
			}
		}

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
		this.glia    = display.glia;
		this.prog    = prog;
		this.vars    = {};
		this.reset();
	}
	
	reset()
	{
		this.texunit = 0;
		this.verts   = 2**32 - 1;
		this.instnum = null;
		this.ibuf    = null;
	}
	
	use()
	{
		this.gl.useProgram(this.prog);
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
		this.reset();
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
	
	indices(buffer)
	{
		let gl = this.gl;
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.getBuf());
		this.ibuf = buffer;
	}
	
	constattrib(name, value)
	{
		let gl   = this.gl;
		let glia = this.glia;
		let loca = this.getVar(name);
		
		if(loca !== undefined) {
			gl.disableVertexAttribArray(loca);
			
			if(typeof value === "number") {
				gl.vertexAttrib1f(loca, value);
			}
			else if(value.length === 2) {
				gl.vertexAttrib2fv(loca, value);
			}
			else if(value.length === 3) {
				gl.vertexAttrib3fv(loca, value);
			}
			else if(value.length === 4) {
				gl.vertexAttrib4f(loca, ...value);
			}
		}
	}
	
	attrib(name, buffer, field, perInstance = false)
	{
		let gl   = this.gl;
		let glia = this.glia;
		let loca = this.getVar(name);
		
		field = field || name;
		
		if(loca !== undefined) {
			gl.enableVertexAttribArray(loca);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer.getBuf());
			
			gl.vertexAttribPointer(
				loca,
				buffer.getFieldSize(field),
				buffer.getType(),
				false,
				buffer.getStride(),
				buffer.getOffset(field)
			);
			
			if(perInstance) {
				glia.vertexAttribDivisorANGLE(loca, 1);
				
				this.instnum = this.instnum === null
					? buffer.getVerts()
					: Math.min(this.instnum, buffer.getVerts());
			}
			else {
				glia.vertexAttribDivisorANGLE(loca, 0);
				this.verts = Math.min(this.verts, buffer.getVerts());
			}
		}
	}
	
	instance(name, buffer, field)
	{
		this.attrib(name, buffer, field, true);
	}
	
	buffer(buffer)
	{
		buffer.getNames().forEach(name => {
			this.attrib(name, buffer);
		});
	}
	
	instancebuffer(buffer)
	{
		buffer.getNames().forEach(name => {
			this.instance(name, buffer);
		});
	}
	
	uniform(name, value)
	{
		if(typeof value === "number") {
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
	
	uniforms(name, values)
	{
		values.forEach((value, i) => {
			this.uniform(name + "[" + i + "]", value);
		});
	}
	
	texture(name, tex)
	{
		let gl = this.gl;
	
		gl.activeTexture(gl.TEXTURE0 + this.texunit);
		gl.bindTexture(gl.TEXTURE_2D, tex.tex);
		gl.uniform1i(this.getVar(name), this.texunit);
		
		this.texunit++;
	}
	
	textures(name, texs)
	{
		texs.forEach((tex, i) => {
			this.texture(name + "[" + i + "]", tex);
		});
	}
	
	triangles()
	{
		this.draw(this.gl.TRIANGLES);
	}
	
	lines(lineWidth = 1)
	{
		this.gl.lineWidth(lineWidth);
		this.draw(this.gl.LINES);
	}
	
	draw(glmode)
	{
		let gl   = this.gl;
		let glia = this.glia;
		
		if(this.instnum === null) {
			if(this.ibuf) {
				if(this.ibuf.getVerts() > 0) {
					gl.drawElements(glmode, this.ibuf.getVerts(), this.ibuf.getType(), 0);
				}
			}
			else {
				if(this.verts > 0) {
					gl.drawArrays(glmode, 0, this.verts);
				}
			}
		}
		else {
			if(this.ibuf) {
				if(this.ibuf.getVerts() > 0) {
					glia.drawElementsInstancedANGLE(
						glmode, this.ibuf.getVerts(), this.ibuf.getType(), 0, this.instnum
					);
				}
			}
			else {
				if(this.verts > 0) {
					glia.drawArraysInstancedANGLE(glmode, 0, this.verts, this.instnum);
				}
			}
		}
	}
}
