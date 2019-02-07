import {VertexLayout} from "../gluck/VertexLayout.js";

export class Skybox
{
	constructor(display)
	{
		this.display = display;
		this.shader  = display.getShader("skybox", vertSrc, fragSrc);
		this.buffer  = display.Buffer("static", layout, box);
	}
	
	draw(camera)
	{
		let gl     = this.display.gl;
		let shader = this.shader;
		
		gl.disable(gl.CULL_FACE);
		
		shader.use();
		shader.uniform("mat", camera.getMatrix(camera.pos));
		shader.buffer(this.buffer);
		shader.triangles();
		
		gl.enable(gl.CULL_FACE);
		gl.clear(gl.DEPTH_BUFFER_BIT);
	}
}

let layout = new VertexLayout("float", ["pos", 3]);

let box = [
	-.5,-.5,-.5,
	+.5,-.5,-.5,
	-.5,+.5,-.5,
	-.5,+.5,-.5,
	+.5,-.5,-.5,
	+.5,+.5,-.5,
	
	-.5,-.5,+.5,
	+.5,-.5,+.5,
	-.5,+.5,+.5,
	-.5,+.5,+.5,
	+.5,-.5,+.5,
	+.5,+.5,+.5,
	
	-.5,-.5,+.5,
	-.5,-.5,-.5,
	-.5,+.5,+.5,
	-.5,+.5,+.5,
	-.5,-.5,-.5,
	-.5,+.5,-.5,
	
	+.5,-.5,+.5,
	+.5,-.5,-.5,
	+.5,+.5,+.5,
	+.5,+.5,+.5,
	+.5,-.5,-.5,
	+.5,+.5,-.5,
	
	-.5,+.5,-.5,
	+.5,+.5,-.5,
	-.5,+.5,+.5,
	-.5,+.5,+.5,
	+.5,+.5,-.5,
	+.5,+.5,+.5,
	
	-.5,-.5,-.5,
	+.5,-.5,-.5,
	-.5,-.5,+.5,
	-.5,-.5,+.5,
	+.5,-.5,-.5,
	+.5,-.5,+.5,
];

let vertSrc = `
	uniform mat4 mat;
	
	attribute vec3 pos;
	
	varying vec3 vPos;
	
	void main()
	{
		gl_Position = mat * vec4(pos, 1.0);
		vPos        = pos;
	}
`;

let fragSrc = `
	uniform sampler2D tex;
	
	varying vec3 vPos;
	
	void main()
	{
		vec3 normPos = normalize(vPos);
		vec3 normHor = normalize(vec3(vPos.x, 0.0, vPos.z));
		float coef   = 1.0 - normPos.y;
		
		coef *= coef;
		coef *= 1.25;
		
		gl_FragColor = (
			vec4(0.5, 0.75, 1.0, 1.0) * coef +
			vec4(0.125, 0.25, 0.5, 1.0) * (1.0 - coef)
		);
	}
`;
