const vert = `
	uniform mat4 proj, view;
	attribute vec3 pos;
	varying vec3 vCol;
	
	void main()
	{
		gl_Position = proj * view * vec4(pos, 1);
		vCol = pos;
	}
`;

const frag = `
	varying vec3 vCol;
	
	void main()
	{
		gl_FragColor = vec4(vCol, 1);
	}
`;

export default class Cube
{
	constructor(gl)
	{
		this.gl = gl;
		
		this.buf = gl.buffer([
			0,0,0, 1,0,0, 0,1,0, 0,1,0, 1,0,0, 1,1,0,
			0,0,0, 0,0,1, 0,1,0, 0,1,0, 0,0,1, 0,1,1,
			0,0,0, 1,0,0, 0,0,1, 0,0,1, 1,0,0, 1,0,1,
			1,0,0, 1,1,0, 1,0,1, 1,0,1, 1,1,0, 1,1,1,
			0,0,1, 1,0,1, 0,1,1, 0,1,1, 1,0,1, 1,1,1,
			1,1,0, 0,1,0, 1,1,1, 1,1,1, 0,1,0, 0,1,1,
		]);
		
		this.layout = this.buf.layout(["pos", 3]);
		this.shader = gl.shader("mediump", vert, frag);
	}
	
	draw(camera)
	{
		this.gl.enable(this.gl.DEPTH_TEST);
		
		this.shader.draw("triangles", 6 * 6, {
			proj: camera.proj,
			view: camera.view,
			layout: this.layout,
		});
	}
}
