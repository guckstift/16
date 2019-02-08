import {treeMesh} from "../meshes/tree.js";
import {VertexLayout} from "../gluck/VertexLayout.js";

let layout = new VertexLayout("float", ["pos", 3], ["normal", 3]);

export class Tree
{
	constructor(display)
	{
		this.buf    = display.Buffer("static", layout, treeMesh.verts);
		this.shader = display.getShader("tree", vertSrc, fragSrc);
	}
	
	draw(camera, sun)
	{
		let shader = this.shader;
		let buf    = this.buf;
		
		shader.use();
		shader.uniform("proj", camera.getProjection());
		shader.uniform("viewModel", camera.getViewModel([2.5,41,2.5]));
		shader.uniform("sun",    sun);
		shader.buffer(buf);
		shader.triangles();
	}
}

const vertSrc = `
	uniform mat4 proj;
	uniform mat4 viewModel;
	uniform vec3 sun;
	
	attribute vec3 pos;
	attribute vec3 normal;
	
	varying float coef;
	
	void main()
	{
		vec4 translatedVert = viewModel * vec4(pos, 1.0);
		
		gl_Position = proj * translatedVert;
		coef = 0.5 + 0.5 * max(0.0, dot(normal, -sun));
	}
`;

const fragSrc = `
	varying float coef;
	
	void main()
	{
		gl_FragColor = vec4(0.5,0.25,0.125,1);
		gl_FragColor.rgb *= coef;
	}
`;
