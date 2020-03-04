import * as glsl from "./glsl.js";

const vert = `
	uniform mat4 mat;
	attribute vec3 offs;
	attribute vec3 pos, norm;
	attribute vec2 uv;
	
	<color>
		uniform vec3 sun;
		varying vec2 vUv;
		varying float vDiff;
		varying vec3 vPos;
	</color>
	
	void main()
	{
		gl_Position = mat * vec4(pos + offs, 1);
		
		<color>
			vDiff = clamp(dot(norm, sun), 0.0, 1.0) * clamp(sun.z, 0.0, 1.0);
			vUv   = uv;
			vPos  = pos + offs;
		</color>
	}
`;

const frag = `
	<color>
		uniform sampler2D tex;
		uniform vec3 campos;
		uniform vec3 sunPos;
		uniform sampler2D skymap;
		varying vec2 vUv;
		varying float vDiff;
		varying vec3 vPos;
	</color>
	
	${glsl.fogged}
	${glsl.getSkyFrag}
	
	void main()
	{
		gl_FragColor = vec4(1);
		
		<color>
			gl_FragColor = texture2D(tex, vUv);
			
			if(gl_FragColor.a == 0.0) {
				discard;
			}
			
			gl_FragColor.rgb *= mix(1.0, vDiff, 0.75);
			gl_FragColor.rgb = fogged(gl_FragColor.rgb, vPos, campos, getSkyFrag(skymap, vec3(1,0,0), sunPos));
		</color>
	}
`;

export default class Model
{
	constructor(gl, filename)
	{
		this.gl = gl;
		this.buf = null;
		this.cnt = 0;
		this.shader = gl.shader("mediump", vert, frag, {color: true});
		this.shaderNocol = gl.shader("mediump", vert, frag, {color: false});
		this.tex = gl.texture("./gfx/tree.png");
		
		fetch(filename)
			.then(res => res.arrayBuffer())
			.then(buf => new Float32Array(buf))
			.then(data => {
				this.cnt = data.length / 8;
				this.buf = gl.buffer({type: "float", layout: [["pos", 3], ["norm", 3], ["uv", 2]], data: data});
			});
	}
	
	draw(camera, sky)
	{
		if(this.buf) {
			this.gl.enable(this.gl.DEPTH_TEST);
			this.gl.disable(this.gl.CULL_FACE);
			this.shader.draw("triangles", this.cnt, {
				mat: camera.mat,
				sun: sky.sun,
				offs: [0,0,1],
				tex: [this.tex, 0],
				buffer: this.buf,
			});
		}
	}
	
	batch(camera, sky, buf, cnt, shadow, colored = true)
	{
		if(this.buf) {
			this.gl.enable(this.gl.DEPTH_TEST);
			this.gl.disable(this.gl.CULL_FACE);
			
			if(colored) {
				this.shader.draw("triangles", this.cnt, cnt, {
					mat: camera.mat,
					sun: sky.sun,
					sunPos: sky.sun,
					skymap: sky.colormap,
					campos: camera.pos,
					offs: buf.attrib("offs"),
					tex: this.tex,
					buffer: this.buf,
				});
			}
			else {
				this.shaderNocol.draw("triangles", this.cnt, cnt, {
					mat: camera.mat,
					offs: buf.attrib("offs"),
					buffer: this.buf,
				});
			}
		}
	}
}
