export function createShader(gl, vertSrc, fragSrc)
{
	let prog = gl.createProgram();
	let vert = gl.createShader(gl.VERTEX_SHADER);
	let frag = gl.createShader(gl.FRAGMENT_SHADER);
	
	vertSrc = `precision mediump float;\n${vertSrc}`;
	fragSrc = `precision mediump float;\n${fragSrc}`;
	
	gl.shaderSource(vert, vertSrc);
	gl.shaderSource(frag, fragSrc);
	gl.compileShader(vert);
	gl.compileShader(frag);
	gl.attachShader(prog, vert);
	gl.attachShader(prog, frag);
	gl.linkProgram(prog);
	
	if(gl.getShaderParameter(vert, gl.COMPILE_STATUS) === false) {
		throw "vertex error: " + gl.getShaderInfoLog(vert);
	}
	
	if(gl.getShaderParameter(frag, gl.COMPILE_STATUS) === false) {
		throw "fragment error: " + gl.getShaderInfoLog(frag);
	}
	
	if(gl.getProgramParameter(prog, gl.LINK_STATUS) === false) {
		throw "program error: " + gl.getProgramInfoLog(prog);
	}
	
	return prog;
}
