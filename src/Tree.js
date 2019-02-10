import {treeMesh} from "../meshes/tree.js";
import {VertexLayout} from "../gluck/VertexLayout.js";

let layout = new VertexLayout("float", ["pos", 3], ["norm", 3], ["col", 3]);

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
		shader.uniform("viewModel", camera.getViewModel([2.5,1,2.5]));
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
	attribute vec3 norm;
	attribute vec3 col;
	
	varying vec3 vTranslatedVert;
	varying vec3 vCol;
	varying float coef;
	
	void main()
	{
		vec4 translatedVert = viewModel * vec4(pos, 1.0);
		
		gl_Position = proj * translatedVert;
		coef = 0.5 + 0.5 * max(0.0, dot(norm, -sun));
		vTranslatedVert = translatedVert.xyz;
		vCol = col;
	}
`;

const fragSrc = `
	varying vec3 vTranslatedVert;
	varying vec3 vCol;
	varying float coef;
	
	void main()
	{
		float fog = min(1.0, 16.0 / length(vTranslatedVert));
		
		gl_FragColor = vec4(vCol,1);
		gl_FragColor.rgb *= coef;
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * vec3(0.75, 0.875, 1.0);
	}
`;
