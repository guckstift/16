import Perlin from "./utils/perlin.js";
import {image} from "./utils/loader.js";
import * as voxGlsl from "./voxels/glsl.js";
	
const vert = `
	uniform mat4 proj, view;
	attribute vec2 baseQuad, quadStart, quadSize;
	attribute float layer, axes;
	varying vec3 vNorm;
	varying vec3 vPos;
	
	${voxGlsl.computePos}
	${voxGlsl.computeNorm}
	
	void main()
	{
		vec3 pos = computePos(axes, layer, quadStart, quadSize, baseQuad);
		gl_Position = proj * view * vec4(pos, 1);
		vNorm = computeNorm(axes);
		vPos = pos;
	}
`;

const frag = `
	uniform sampler2D tex;
	varying vec3 vNorm;
	varying vec3 vPos;
	
	void main()
	{
		vec2 uv = vec2(0);
		
		if(vNorm.x != 0.0) {
			uv = vPos.yz;
		}
		else if(vNorm.y != 0.0) {
			uv = vPos.xz;
		}
		else if(vNorm.z != 0.0) {
			uv = vPos.xy;
		}
		
		gl_FragColor = texture2D(tex, fract(uv) / 16.0);
	}
`;

export default class Chunk
{
	constructor(gl, mesher, w, h, d)
	{
		this.w = w;
		this.h = h;
		this.d = d;
		this.gl = gl;
		this.perlin = new Perlin();
		this.heights = new Array(w * h);
		this.voxels = new Array(w * h * d);
		
		for(let y=0, i=0; y<h; y++) {
			for(let x=0; x<w; x++, i++) {
				this.heights[i] = (this.perlin.perlin2(x / w * 8, y / h * 8) + 1) * d / 8;
			}
		}
		
		for(let z=0, i=0; z<d; z++) {
			for(let y=0; y<h; y++) {
				for(let x=0; x<w; x++, i++) {
					if(this.heights[y * w + x] > z) {
						this.voxels[i] = 1;
					}
					else {
						this.voxels[i] = 0;
					}
				}
			}
		}
		
		let func = (x,y,z) => (
			this.getVoxel(x,y,z)
		);
		
		let equ = ([px,py,pz], [qx,qy,qz]) => (
			this.getVoxel(px,py,pz) === this.getVoxel(qx,qy,qz)
		);
		
		console.log(performance.now());
		this.quads = mesher([w,h,d], func,func,equ);
		console.log(performance.now());
		this.buf = gl.buffer("ushort", this.quads);
		this.layout = this.buf.layout("ushort", 1, ["quadStart", 2], ["quadSize", 2], ["layer", 1], ["axes", 1]);
		this.quad = gl.buffer("ubyte", [0,0, 1,0, 0,1, 1,1]);
		this.quadlayout = this.quad.layout("ubyte", ["baseQuad", 2]);
		this.shader = gl.shader("mediump", vert, frag);
		this.tex = gl.texture(1, 1);
		
		image("./gfx/atlas.png").then(img => {
			this.tex = gl.texture(img);
		});
	}
	
	getVoxel(x, y, z)
	{
		let w = this.w;
		let h = this.h;
		let d = this.d;
		
		if(x >= 0 && x < w && y >= 0 && y < h && z >= 0 && z < d) {
			return this.voxels[x + y * w + z * w * h]
		}
		else {
			return 0;
		}
	}
	
	setVoxel(x, y, z, v)
	{
		let w = this.w;
		let h = this.h;
		let d = this.d;
		
		if(x >= 0 && x < w && y >= 0 && y < h && z >= 0 && z < d) {
			this.voxels[x + y * w + z * w * h] = v;
		}
	}
	
	draw(camera)
	{
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.CULL_FACE);
		
		this.shader.draw("trianglestrip", 4, this.quads.length / 6, {
			proj: camera.proj,
			view: camera.view,
			layouts: [this.layout, this.quadlayout],
			tex: [this.tex, 0],
		});
	}
}
