import {VertexLayout} from "../gluck/VertexLayout.js";

export class Ground
{
	constructor(display, sun)
	{
		this.display = display;
		this.sun     = sun;
		this.tex     = display.getTexture("gfx/atlas.png");
		this.buf     = display.Buffer("static", vertLayout, verts);
		this.shader  = display.getShader("ground", vertSrc, fragSrc);
	}
	
	draw(camera, sun, pos)
	{
		let gl     = this.display.gl;
		let shader = this.shader;
		
		shader.use();
		shader.texture("tex",     this.tex);
		shader.uniform("proj",    camera.getProjection());
		shader.uniform("view",    camera.getView());
		shader.uniform("model",   camera.getModel([camera.pos[0], 0, camera.pos[2]]));
		shader.uniform("sun",     this.sun.getRayDir());
		shader.uniform("diff",    0.5);
		shader.uniform("fogCol",  [0.75, 0.875, 1.0]);
		shader.uniform("fogDist", 16);
		shader.buffer(this.buf);
		shader.triangles();
	}
}

const vertLayout = new VertexLayout("float", ["pos", 2]);

const f = 2048;

const verts = [
	-f,-f,
	+f,-f,
	-f,+f,
	-f,+f,
	+f,-f,
	+f,+f,
];

const vertSrc = `
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 model;
	uniform vec3 sun;
	uniform float diff;
	
	attribute vec2 pos;
	
	varying vec4 vMpos;
	varying vec4 vTransPos;
	varying vec3 vPos;
	varying vec2 vUvOffset;
	varying vec2 vPlanePos;
	varying float vCoef;
	
	void main()
	{
		float tile   = 2.0;
		float height = 1.0 - 1.0 / 256.0;
		
		vPos        = vec3(pos.x, height, pos.y);
		vMpos       = model * vec4(vPos, 1.0);
		vTransPos   = view * vMpos;
		gl_Position = proj * vTransPos;
		vUvOffset   = vec2(mod(tile, 16.0), floor(tile / 16.0));
		vPlanePos   = vec2(0.0 + vMpos.x, 0.0 - vMpos.z);
		vCoef       = (1.0 - diff) + diff * max(0.0, dot(vec3(0,1,0), -sun));
	}
`;

const fragSrc = `
	uniform sampler2D atlas;
	uniform vec3 fogCol;
	uniform vec3 sun;
	uniform float fogDist;
	
	varying vec4 vMpos;
	varying vec4 vTransPos;
	varying vec3 vPos;
	varying vec2 vUvOffset;
	varying vec2 vPlanePos;
	varying float vCoef;
	
	void main()
	{
		if(vMpos.z > 0.0 && vMpos.z < 256.0 && vMpos.x > 0.0 && vMpos.x < 256.0) {
			discard;
		}
		
		vec2 uv   = (vUvOffset + fract(vPlanePos)) / 16.0;
		float fog = min(1.0, fogDist / length(vTransPos.xyz));
		
		gl_FragColor      = texture2D(atlas, uv);
		gl_FragColor.rgb *= vCoef;
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * fogCol * max(0.0, -sun.y);
	}
`;
