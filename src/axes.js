const vert = `
	uniform mat4 proj, view;
	attribute vec3 pos, col;
	varying vec3 vCol;
	
	void main()
	{
		gl_Position = proj * view * vec4(pos, 1);
		vCol = col;
	}
`;

const frag = `
	varying vec3 vCol;
	
	void main()
	{
		gl_FragColor = vec4(vCol, 1);
	}
`;

export default class Axes
{
	constructor(gl)
	{
		this.gl = gl;
		
		this.buf = gl.buffer({layout: [["pos", 3], ["col", 3]], data: [
			0,0,0, 1,0,0,
			1,0,0, 1,0,0,
			0,0,0, 0,1,0,
			0,1,0, 0,1,0,
			0,0,0, 0,0,1,
			0,0,1, 0,0,1,
		]});
		
		this.shader = gl.shader("mediump", vert, frag);
	}
	
	draw(camera)
	{
		this.gl.disable(this.gl.DEPTH_TEST);
		
		this.shader.draw("lines", 6, {
			proj: camera.proj,
			view: camera.view,
			buffer: this.buf,
		});
	}
}
