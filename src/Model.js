import {VertexLayout} from "../gluck/VertexLayout.js";
import {shadowVertSrc, shadowFragSrc} from "./glsl.js";

let layout = new VertexLayout("float", ["pos", 3], ["norm", 3], ["uv", 2]);

export class Model
{
	constructor(display, data, indices, tex)
	{
		if(typeof tex === "string") {
			tex = display.getTexture(tex);
		}
		
		this.tex      = tex;
		this.display  = display;
		this.buf      = display.Buffer("static", layout, data);
		this.ibuf     = display.Buffer("static", "index", indices);
		
		this.shader_c = display.getShader(
			"model_c", modelVertSrc, modelFragSrc, {color: true, layers: 3, bias: 1 / 4096}
		);
		
		this.shader_d = display.getShader(
			"model_d", modelVertSrc, modelFragSrc, {color: false}
		);
	}
	
	drawDepth(pos, camera, instances = null)
	{
		let shader = this.shader_d;
		let buf    = this.buf;
		
		shader.use();
		shader.texture("tex",     this.tex);
		shader.uniform("proj",    camera.getProjection());
		shader.uniform("view",    camera.getView());
		shader.uniform("model",   camera.getModel(pos));
		shader.indices(this.ibuf);
		shader.buffer(buf);
		
		if(instances) {
			shader.instancebuffer(instances);
		}
		else {
			shader.constattrib("ipos", pos);
		}
		
		shader.triangles();
	}
	
	draw(pos, camera, sun, shadows, instances = null)
	{
		let shader = this.shader_c;
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
		shader.uniforms("shadowMats", shadows.getMatrices());
		shader.textures("depths",     shadows.getDepthTexs());
		shader.indices(this.ibuf);
		shader.buffer(buf);
		
		if(instances) {
			shader.instancebuffer(instances);
		}
		else {
			shader.constattrib("ipos", pos);
		}
		
		shader.triangles();
	}
}

export const modelVertSrc = shadowVertSrc + `
	<color>
		uniform vec3 sun;
		uniform float diff;
	</color>
	
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 model;
	
	<color>
		attribute vec3 norm;
	</color>
	
	attribute vec2 uv;
	attribute vec3 ipos;
	attribute vec3 pos;
	
	<color>
		varying float vCoef;
	</color>
	
	varying vec2 vUv;
	varying vec4 vTransPos;
	
	void main()
	{
		vTransPos   = view * model * vec4(ipos + pos, 1);
		gl_Position = proj * vTransPos;
		vUv         = uv;
		
		<color>
			setShadowVerts(model, ipos + pos);
			vCoef = (1.0 - diff) + diff * max(0.0, dot(norm, sun)) * max(0.0, sun.y);
		</color>
	}
`;

export const modelFragSrc = shadowFragSrc + `
	uniform sampler2D tex;
	
	<color>
		uniform vec3 fogCol;
		uniform vec3 sun;
		uniform float fogDist;
		
		varying vec4 vTransPos;
		varying float vCoef;
	</color>
	
	varying vec2 vUv;
	
	void main()
	{
		gl_FragColor = texture2D(tex, vUv);
		
		if(gl_FragColor.a == 0.0) {
			discard;
		}
		
		<color>
			float fog = min(1.0, fogDist / length(vTransPos.xyz));
			float depthOccl = getShadowOccl() * max(0.0, sun.y);
			
			gl_FragColor.rgb *= vCoef * (1.0 - depthOccl * 0.5);
			gl_FragColor.rgb *= fog;
			gl_FragColor.rgb += (1.0 - fog) * fogCol * sun.y;
		</color>
	}
`;
