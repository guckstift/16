import {VertexLayout} from "../gluck/VertexLayout.js";

let layout = new VertexLayout("float", ["pos", 3], ["norm", 3], ["col", 3]);

export class Model
{
	constructor(display, mesh)
	{
		this.buf    = display.Buffer("static", layout, mesh);
		this.shader = display.getShader("model", vertSrc, fragSrc);
	}
	
	draw(pos, camera, sun)
	{
		let shader = this.shader;
		let buf    = this.buf;
		
		shader.use();
		shader.uniform("proj",    camera.getProjection());
		shader.uniform("view",    camera.getView());
		shader.uniform("model",   camera.getModel(pos));
		shader.uniform("sun",     sun);
		shader.uniform("diff",    0.5);
		shader.uniform("fogCol",  [0.75, 0.875, 1.0]);
		shader.uniform("fogDist", 16);
		shader.buffer(buf);
		shader.triangles();
	}
}

const vertSrc = `
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 model;
	uniform vec3 sun;
	uniform float diff;
	
	attribute vec3 pos;
	attribute vec3 norm;
	attribute vec3 col;
	
	varying vec4 vTransPos;
	varying vec3 vCol;
	varying float vCoef;
	
	void main()
	{
		vTransPos   = view * model * vec4(pos, 1.0);
		gl_Position = proj * vTransPos;
		vCoef       = (1.0 - diff) + diff * max(0.0, dot(norm, -sun));
		vCol        = col;
	}
`;

const fragSrc = `
	varying vec4 vTransPos;
	varying vec3 vCol;
	varying float vCoef;
	
	uniform vec3 fogCol;
	uniform float fogDist;
	
	void main()
	{
		float fog = min(1.0, fogDist / length(vTransPos.xyz));
		
		gl_FragColor      = vec4(vCol, 1.0);
		gl_FragColor.rgb *= vCoef;
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * fogCol;
	}
`;
