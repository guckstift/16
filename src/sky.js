import vec3 from "./math/vec3.js";
import {radians} from "./math/math.js";

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
	uniform vec3 dayZenithCol, dayHorizonCol,
	             dawnZenithCol, dawnHorizonCol,
	             nightZenithCol, nightHorizonCol,
	             sunPos, sunCol;
	
	varying vec3 vPos;
	
	vec3 getSkyFrag(
		vec3 norm, vec3 sunPos,
		vec3 dayZenithCol, vec3 dayHorizonCol,
		vec3 dawnZenithCol, vec3 dawnHorizonCol,
		vec3 nightZenithCol, vec3 nightHorizonCol
	) {
		float dayFac   = clamp(+sunPos.z, 0.0, 1.0);
		float dawnFac  = clamp(1.0 - abs(sunPos.z), 0.0, 1.0);
		float nightFac = clamp(-sunPos.z, 0.0, 1.0);
		
		float grad = 1.0 - norm.z;
		grad *= dot(norm, sunPos) * 0.5 + 0.5;
		
		vec3 dayCol   = mix(dayZenithCol, dayHorizonCol, grad);
		vec3 dawnCol  = mix(dawnZenithCol, dawnHorizonCol, grad);
		vec3 nightCol = mix(nightZenithCol, nightHorizonCol, grad);
		
		return dayCol * dayFac + dawnCol * dawnFac + nightCol * nightFac;
	}
	
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
		
		vec3 skyFrag = getSkyFrag(
			norm, sunPos, dayZenithCol, dayHorizonCol, dawnZenithCol, dawnHorizonCol, nightZenithCol, nightHorizonCol
		);
		
		gl_FragColor.rgb = skyFrag + sunFrag;
	}
`;

export default class Sky
{
	constructor(gl)
	{
		this.gl = gl;
		this.buf = gl.buffer({layout: [["pos", 3]], data: verts});
		this.shader = gl.shader("mediump", vert, frag);
		this.sun = vec3(0, 1, 0);
		this.phase = 0.0;
		this.speed = 8 / 256;
		this.incline = 0;//-30;
	}
	
	update(delta)
	{
		this.phase += delta * this.speed;
		vec3(0, 1, 0, this.sun);
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
			dayZenithCol: [0.0, 0.125, 0.5],
			dayHorizonCol: [0.6, 0.8, 1.0],
			dawnZenithCol: [0.03, 0.06, 0.25],
			dawnHorizonCol: [1.0, 0.5, 0.25],
			nightZenithCol: [0.0, 0.0, 0.1],
			nightHorizonCol: [0.05, 0.0, 0.2],
			sunCol: [1.0, 0.5, 0.25],
			sunPos: this.sun,
			buffer: this.buf,
		});
	}
}
