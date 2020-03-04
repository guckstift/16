const vert = `
	uniform mat4 mat;
	uniform vec3 offset;
	attribute vec3 pos;
	varying vec3 vCol;
	
	void main()
	{
		gl_Position = mat * vec4(pos + offset, 1);
		vCol = pos;
	}
`;

const frag = `
	uniform sampler2D tex;
	varying vec3 vCol;
	
	void main()
	{
		gl_FragColor = texture2D(tex, vCol.xz);
	}
`;

export default class Quad
{
	constructor(gl)
	{
		this.gl = gl;
		this.buf = gl.buffer({layout: [["pos", 3]], data: [0,0,0, 1,0,0, 0,0,1, 0,0,1, 1,0,0, 1,0,1]});
		this.shader = gl.shader("mediump", vert, frag);
	}
	
	draw(camera, tex, offset = [0,0,0])
	{
		this.gl.disable(this.gl.DEPTH_TEST);
		
		let off = [offset[0] + camera.x, offset[1] + camera.y, offset[2] + camera.z]
		
		this.shader.draw("triangles", 6, {
			mat: camera.mat,
			buffer: this.buf,
			offset: off,
			tex: tex,
		});
	}
}
