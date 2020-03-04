import * as glsl from "./glsl.js";

const far = 2048;

const vert = `
	uniform mat4 mat;
	uniform vec3 sun;
	attribute vec2 pos;
	varying vec3 vPos;
	varying float vDiff;
	
	void main()
	{
		vec3 norm   = vec3(0, 0, 1);
		vPos        = vec3(pos, 0);
		vDiff       = clamp(dot(norm, sun), 0.0, 1.0) * clamp(sun.z, 0.0, 1.0);
		gl_Position = mat * vec4(vPos, 1);
	}
`;

const frag = `
	varying vec3 vPos;
	
	<color>
		uniform sampler2D tex;
		uniform vec3 sun;
		uniform vec3 campos;
		uniform vec3 sunPos;
		uniform sampler2D skymap;
		varying float vDiff;
	</color>
	
	${glsl.fogged}
	${glsl.getSkyFrag}
	
	void main()
	{
		<color>
			vec2 uv = fract(vPos.xy * vec2(1,-1));
			gl_FragColor = texture2D(tex, (uv + vec2(2,0)) / 16.0);
			gl_FragColor.rgb *= mix(1.0, vDiff, 0.5);
			gl_FragColor.rgb = fogged(gl_FragColor.rgb, vPos, campos, getSkyFrag(skymap, vec3(1,0,0), sunPos));
		</color>
	}
`;

export default class Ground
{
	constructor(gl)
	{
		this.gl          = gl;
		this.tex         = gl.texture("./gfx/atlas.png");
		this.shader      = gl.shader("mediump", vert, frag, {color: true});
		this.shaderNocol = gl.shader("mediump", vert, frag, {color: false});
		this.buf         = gl.buffer({layout: [["pos", 2]], data: [-far,-far, +far,-far, -far,+far, +far,+far]});
	}
	
	draw(camera, sky, shadow, colored = true)
	{
		this.gl.enable(this.gl.DEPTH_TEST);
		
		this.shader.draw("trianglestrip", 4, {
			mat: camera.mat,
			sun: sky.sun,
			campos: camera.pos,
			buffer: this.buf,
			tex: this.tex,
			sunPos: sky.sun,
			skymap: sky.colormap,
		});
	}
}
