import vec3 from "./vec3.js";
import {radians, clamp} from "./math.js";
import * as glsl from "./glsl.js";

const verts = [
	-1,+1,-1, +1,+1,-1, -1,+1,+1,  -1,+1,+1, +1,+1,-1, +1,+1,+1, // back
	+1,-1,-1, -1,-1,-1, +1,-1,+1,  +1,-1,+1, -1,-1,-1, -1,-1,+1, // front
	-1,-1,-1, -1,+1,-1, -1,-1,+1,  -1,-1,+1, -1,+1,-1, -1,+1,+1, // left
	+1,+1,-1, +1,-1,-1, +1,+1,+1,  +1,+1,+1, +1,-1,-1, +1,-1,+1, // right
	-1,-1,-1, +1,-1,-1, -1,+1,-1,  -1,+1,-1, +1,-1,-1, +1,+1,-1, // bottom
	-1,+1,+1, +1,+1,+1, -1,-1,+1,  -1,-1,+1, +1,+1,+1, +1,-1,+1, // top
];

const vert = `
	uniform mat4 proj, view, model;
	attribute vec3 pos;
	varying vec3 vPos;
	
	void main()
	{
		gl_Position = proj * view * model * vec4(pos, 1);
		vPos = pos;
	}
`;

const frag = `
	uniform vec3 sunPos, sunCol;
	uniform sampler2D colormap;
	varying vec3 vPos;
	
	${glsl.getSkyFrag}
	
	vec3 getSunFrag(vec3 norm, vec3 sunPos, vec3 sunCol)
	{
		float sunDist = distance(norm, sunPos);
		float coef = clamp(1.0 / (128.0 * sunDist * sunDist), 0.0, 4.0);
		return sunCol * coef;
	}
	
	void main()
	{
		vec3 norm = normalize(vPos);
		vec3 sunFrag = getSunFrag(norm, sunPos, sunCol);
		vec3 skyFrag = getSkyFrag(colormap, norm, sunPos);
		
		gl_FragColor.a = 1.0;
		gl_FragColor.rgb = skyFrag + sunFrag;
	}
`;

export default class Sky
{
	constructor(gl,
		speed = 1 / 256,
		incline = 30,
		colormap = "sky.png",
	) {
		this.gl = gl;
		this.colormap = gl.texture("linear", "./gfx/" + colormap);
		this.buf = gl.buffer({layout: [["pos", 3]], data: verts});
		this.shader = gl.shader("mediump", vert, frag);
		this.sun = vec3(0, 0, 1);
		this.phase = 0.0;
		this.speed = speed;
		this.incline = incline;
		this.zenithCol = vec3();
	}
	
	update(delta)
	{
		this.phase += delta * this.speed;
		vec3(0, 0, 1, this.sun);
		vec3.rotateX(this.sun, radians(360) * this.phase, this.sun);
		vec3.rotateY(this.sun, radians(this.incline), this.sun);
	}
	
	draw(cam)
	{
		this.gl.disable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.CULL_FACE);
		
		this.shader.draw("triangles", verts.length / 3, {
			proj: cam.proj,
			view: cam.view,
			model: cam.model,
			sunPos: this.sun,
			buffer: this.buf,
			colormap: this.colormap,
			sunCol: [1.0, 0.5, 0.25],
		});
	}
}
