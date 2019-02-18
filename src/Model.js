import {VertexLayout} from "../gluck/VertexLayout.js";

let layout = new VertexLayout("float", ["pos", 3], ["norm", 3], ["uv", 2]);

export class Model
{
	constructor(display, data, indices, texfile)
	{
		this.display = display;
		this.buf     = display.Buffer("static", layout, data);
		this.ibuf    = display.Buffer("static", "index", indices);
		this.shader  = display.getShader("model", modelVertSrc, modelFragSrc);
		this.tex     = display.getTexture(texfile);
	}
	
	draw(pos, camera, sun, instances = null)
	{
		let shader = this.shader;
		let buf    = this.buf;
		
		shader.use();
		shader.texture("tex",     this.tex);
		shader.uniform("proj",    camera.getProjection());
		shader.uniform("view",    camera.getView());
		shader.uniform("model",   camera.getModel(pos));
		shader.uniform("sun",     sun);
		shader.uniform("diff",    0.5);
		shader.uniform("fogCol",  [0.75, 0.875, 1.0]);
		shader.uniform("fogDist", 16);
		shader.indices(this.ibuf);
		shader.buffer(buf);
		
		if(instances) {
			shader.instance("ipos", instances);
		}
		else {
			shader.constattrib("ipos", [0,0,0]);
		}
		
		shader.triangles();
	}
}

export const modelVertSrc = `
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 model;
	uniform vec3 sun;
	uniform float diff;
	
	attribute vec3 ipos;
	attribute vec3 pos;
	attribute vec3 norm;
	attribute vec2 uv;
	
	varying vec4 vTransPos;
	varying vec2 vUv;
	varying float vCoef;
	
	void main()
	{
		vTransPos   = view * model * vec4(ipos + pos, 1);
		gl_Position = proj * vTransPos;
		vCoef       = (1.0 - diff) + diff * max(0.0, dot(norm, sun));
		vUv         = uv;
	}
`;

export const modelFragSrc = `
	uniform sampler2D tex;
	uniform vec3 fogCol;
	uniform vec3 sun;
	uniform float fogDist;
	
	varying vec4 vTransPos;
	varying vec2 vUv;
	varying float vCoef;
	
	void main()
	{
		float fog = min(1.0, fogDist / length(vTransPos.xyz));
		
		gl_FragColor      = texture2D(tex, vUv);
		
		if(gl_FragColor.a == 0.0) {
			discard;
		}
		
		gl_FragColor.rgb *= vCoef;
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * fogCol * sun.y;
	}
`;
