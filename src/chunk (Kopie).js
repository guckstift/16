import mesh from "./voxels/mesher.js";
//import slopes from "./voxels/slopes.js";
import * as voxGlsl from "./voxels/glsl.js";
import {image} from "./utils/loader.js";
import * as glsl from "./webgl/glsl.js";

window.q = 0;

const vert = `
	${voxGlsl.computePos}
	${voxGlsl.computeNorm}
	${voxGlsl.computeAO}
	${glsl.diffuse}
	
	uniform mat4 proj, view;
	uniform vec3 offset, sun;
	attribute vec2 baseQuad, flipQuad, quadStart, quadSize;
	attribute float layer, axesAndFlip, voxel, aoval;
	varying vec3 vPos, vNorm;
	varying float vAO, vDiff, vVoxel;
	
	void main()
	{
		vPos   = computePos(baseQuad, flipQuad, quadStart, quadSize, layer, axesAndFlip);
		vNorm  = computeNorm(axesAndFlip);
		vAO    = computeAO(baseQuad, flipQuad, axesAndFlip, aoval);
		vDiff  = sunlight(vNorm, sun);
		vVoxel = voxel;
		gl_Position = proj * view * vec4(vPos + offset, 1);
	}
`;

const frag = `
	uniform sampler2D tex;
	varying vec3 vPos, vNorm;
	varying float vAO, vDiff, vVoxel;
	
	void main()
	{
		vec2 uv = vNorm.x != 0.0 ? vPos.yz :
		          vNorm.y != 0.0 ? vPos.xz :
		          vNorm.z != 0.0 ? vPos.xy :
		          vec2(0);
		
		gl_FragColor = texture2D(tex, (fract(uv) + vec2(vVoxel - 1.0, 0)) / 16.0);
		gl_FragColor.rgb *= mix(vAO, vDiff, 0.5);
	}
`;

const slopeVert = `
	${voxGlsl.computeSlopePos}
	${voxGlsl.computeSlopeNorm}
	${glsl.diffuse}
	
	uniform mat4 proj, view;
	uniform vec3 offset, sun;
	attribute vec2 baseQuad, slopeStart, slopeSize;
	attribute float layer, slope, voxel, aoval;
	varying vec3 vPos;
	varying float vAO, vVoxel, vDiff;
	
	void main()
	{
		vPos   = computeSlopePos(baseQuad, slopeStart, slopeSize, layer, slope);
		vAO    = 1.0;
		vVoxel = voxel;
		vDiff  = diffuse(computeSlopeNorm(slope), sun);
		gl_Position = proj * view * vec4(vPos + offset, 1);
	}
`;

const slopeFrag = `
	uniform sampler2D tex;
	varying vec3 vPos;
	varying float vAO, vVoxel, vDiff;
	
	void main()
	{
		vec2 uv = vPos.xy;
		gl_FragColor = texture2D(tex, (fract(uv) + vec2(vVoxel - 1.0, 0)) / 16.0);
		gl_FragColor.rgb *= mix(vAO, vDiff, 1.0);
	}
`;

export default class Chunk
{
	constructor(gl, x, y, z, w, h, d, map)
	{
		this.getVoxel = this.getVoxel.bind(this);
		this.getFullVoxel = this.getFullVoxel.bind(this);
		this.getVoxelIndex = this.getVoxelIndex.bind(this);
		this.getFullVoxelIndex = this.getFullVoxelIndex.bind(this);
		this.getSlopeIndex = this.getSlopeIndex.bind(this);
		this.gl = gl;
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
		this.h = h;
		this.d = d;
		this.size = [w, h, d];
		this.map = map;
		this.data = new Uint16Array(w * h * d);
		this.basequad = gl.buffer({type: "ubyte", layout: [["baseQuad", 2]], data: [0,0, 1,0, 0,1, 1,1]});
		this.flipquad = gl.buffer({type: "ubyte", layout: [["flipQuad", 2]], data: [1,0, 1,1, 0,0, 0,1]});
		this.shader = gl.shader("mediump", vert, frag);
		this.slshader = gl.shader("mediump", slopeVert, slopeFrag);
		this.tex = gl.texture(1, 1);
		this.outdated = false;
		
		image("./gfx/atlas.png").then(gl.texture).then(tex => this.tex = tex);
	}
	
	getIndex(x, y, z)
	{
		return x + this.w * (y + this.h * z);
	}
	
	isInside(x, y, z)
	{
		return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d;
	}
	
	getVoxel(x, y, z)
	{
		if(this.isInside(x, y, z)) {
			return this.data[this.getIndex(x, y, z)];
		}
		else if(this.map) {
			return this.map.getVoxel(x + this.x, y + this.y, z + this.z);
		}
		
		return 0;
	}
	
	isSolid(x, y, z)
	{
		return this.getVoxel(x, y, z) > 0;
	}
	
	getFullVoxel(x, y, z)
	{
		let vox = this.getVoxel(x, y, z);
		
		if(vox & 0xff00) {
			vox = 0;
		}
		
		return vox;
	}
	
	getVoxelIndex(i)
	{
		return this.data[i];
	}
	
	getFullVoxelIndex(i)
	{
		let vox = this.getVoxelIndex(i);
		
		if(vox & 0xff00) {
			vox = 0;
		}
		
		return vox;
	}
	
	getSlopeIndex(i)
	{
		return this.data[i] >> 8;
	}
	
	getSlope(x, y, z)
	{
		return this.getVoxel(x, y, z) >> 8;
	}
	
	setVoxel(x, y, z, v)
	{
		if(this.isInside(x, y, z)) {
			this.data[this.getIndex(x, y, z)] = v;
			this.outdated = true;
		}
		else if(this.map) {
			this.map.setVoxel(x + this.x, y + this.y, z + this.z, v);
		}
	}
	
	setVoxelIndex(i, v)
	{
		this.data[i] = v;
		this.outdated = true;
	}
	
	updateMesh()
	{
		if(this.outdated) {
			let t0 = performance.now();
			
			let {quads, slopes} = mesh({dims: this.size, vox: this.getVoxel});
			
			this.quads = quads;
			
			this.count = this.quads.length / 8;
			
			this.buffer = this.gl.buffer({
				type: "ushort", divisor: 1,
				layout: [["quadStart", 2], ["quadSize", 2], ["layer", 1], ["axesAndFlip", 1], ["voxel", 1], ["aoval", 1]],
				data: this.quads,
			});
			
			q += this.quads.length / 8;
			this.outdated = false;
			
			this.slopes = slopes;
			this.slcnt = this.slopes.length / 8;
			
			this.slbuf = this.gl.buffer({
				typeslbuf: "ushort", divisor: 1,
				layout: [["slopeStart", 2], ["slopeSize", 2], ["layer", 1], ["slope", 1], ["voxel", 1], ["aoval", 1]],
				data: this.slopes,
			});
		}
	}
	
	draw(camera, sky)
	{
		this.updateMesh();
		
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.disable(this.gl.CULL_FACE);
		
		this.shader.draw("trianglestrip", 4, this.count, {
			proj: camera.proj,
			view: camera.view,
			sun: sky.sun,
			offset: [this.x, this.y, this.z],
			buffers: [this.buffer, this.basequad, this.flipquad],
			tex: [this.tex, 0],
		});
		
		this.slshader.draw("trianglestrip", 4, this.slcnt, {
			proj: camera.proj,
			view: camera.view,
			sun: sky.sun,
			offset: [this.x, this.y, this.z],
			buffers: [this.slbuf, this.basequad, this.flipquad],
			tex: [this.tex, 0],
		});
	}
}
