import {VertexLayout} from "../gluck/VertexLayout.js";

export class Skybox
{
	constructor(display, sun)
	{
		this.display = display;
		this.sun     = sun;
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
		shader.uniform("sun", this.sun.getSkyDir());
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
	uniform vec3 sun;
	
	varying vec3 vPos;
	
	void main()
	{
		gl_FragColor.a = 1.0;
		
		vec3  norm  = normalize(vPos);
		float coef = 1.0 - norm.y;
		
		coef *= coef * 2.0;
		
		gl_FragColor.rgb = mix(
			vec3(0.125, 0.25, 0.5),
			vec3(0.5, 0.75, 1.0),
			coef
		);
		
		gl_FragColor.rgb = mix(
			vec3(0.0, 0.0, 0.125),
			gl_FragColor.rgb,
			max(0.0, sun.y)
		);
		
		float dist = distance(norm, sun);
		
		/*if(dist < 0.125) {
			gl_FragColor.rgb = mix(
				pow(vec3(1.0, 0.75, 0.5), vec3(0.5)),
				gl_FragColor.rgb,
				dist
			);
		}*/
		
		if(dist < 0.5) {
			gl_FragColor.rgb += vec3(1.0, 0.75, 0.5) / (256.0 * pow(dist, 2.0));
		}
	}
`;
