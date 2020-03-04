import Model from "./model.js";
import Batch from "./batch.js";
import * as glsl from "./glsl.js";
import {intervalFind, intervalPlace} from "./intervals.js";

const nullchunk = {
	data: [0, 0],
};

const vert = `
	const float hsqrt2 = sqrt(2.0) / 2.0;
	uniform mat4 mat;
	attribute vec2 baseQuad, flipQuad, quadStart, quadSize;
	attribute float layer, afs, terra, aoval;
	
	<color>
		uniform mat4 shadowmats[<layers>];
		uniform vec3 sun;
		varying vec3 vPos, vNorm;
		varying float vAO, vDiff, vTerra;
		varying vec4 vShadowverts[<layers>];
		varying vec3 test;
	</color>
	
	${glsl.getShadowVerts}
	
	void main()
	{
		float axes  = mod(afs, 8.0);
		float flip  = mod(floor(afs * 0.125), 2.0);
		float slope = floor(afs * 0.0625);
		vec2 quad   = flip == 0.0 ? baseQuad : flipQuad;
		
		quad = flip == 0.0 ? axes == 6.0 && quad == vec2(0)   ? vec2(1,0) :
		                     axes == 7.0 && quad == vec2(1)   ? vec2(0,1) : quad :
		                     axes == 6.0 && quad == vec2(1,0) ? vec2(1)   :
		                     axes == 7.0 && quad == vec2(0,1) ? vec2(0)   : quad ;
		
		float index = quad.x + quad.y * 2.0;
		float raise = mod(floor(slope * pow(0.5, index)), 2.0);
		
		vec2 axs = axes == 0.0 ? vec2(0,1) :
		           axes == 1.0 ? vec2(0,2) :
		           axes == 2.0 ? vec2(1,0) :
		           axes == 3.0 ? vec2(1,2) :
		           axes == 4.0 ? vec2(2,0) :
		           axes == 5.0 ? vec2(2,1) :
		           axes == 6.0 ? vec2(0,1) :
		           axes == 7.0 ? vec2(0,1) :
		           vec2(0);
		
		float ax2p = axes == 0.0 || axes == 3.0 || axes == 4.0 ||
		             axes == 6.0 || axes == 7.0 ? 1.0 : 0.0;
		
		vec2 size  = quadSize + vec2(1);
		vec2 p2    = quadStart + size * quad;
		
		vec3 pos = vec3(
			axs.x == 0.0 ? p2.x : axs.y == 0.0 ? p2.y : layer + ax2p,
			axs.x == 1.0 ? p2.x : axs.y == 1.0 ? p2.y : layer + ax2p,
			axs.x == 2.0 ? p2.x : axs.y == 2.0 ? p2.y : layer + ax2p
		);
		
		pos.z += slope > 0.0 ? raise - 1.0 : 0.0;
		gl_Position = mat * vec4(pos, 1);
		
		<color>
			vNorm = slope == 12.0 ? vec3(0, -hsqrt2, hsqrt2) :
				    slope ==  3.0 ? vec3(0, +hsqrt2, hsqrt2) :
				    slope == 10.0 ? vec3(-hsqrt2, 0, hsqrt2) :
				    slope ==  5.0 ? vec3(+hsqrt2, 0, hsqrt2) :
				    axes == 0.0 ? vec3( 0, 0,+1) :
				    axes == 1.0 ? vec3( 0,-1, 0) :
				    axes == 2.0 ? vec3( 0, 0,-1) :
				    axes == 3.0 ? vec3(+1, 0, 0) :
				    axes == 4.0 ? vec3( 0,+1, 0) :
				    axes == 5.0 ? vec3(-1, 0, 0) :
				    axes == 6.0 ? vec3( 0, 0,+1) :
				    axes == 7.0 ? vec3( 0, 0,+1) :
				    vec3(0);
			
			float ao = aoval;
			float ao00 = mod(ao, 4.0);
			ao = floor(ao * 0.25);
			float ao10 = mod(ao, 4.0);
			ao = floor(ao * 0.25);
			float ao01 = mod(ao, 4.0);
			ao = floor(ao * 0.25);
			float ao11 = mod(ao, 4.0);
			
			vAO = 0.25 + 0.25 * (
				quad.x == 0.0 ? quad.y == 0.0 ? ao00
				                              : ao01
				              : quad.y == 0.0 ? ao10
				                              : ao11
			);
			
			vDiff  = clamp(dot(vNorm, sun), 0.0, 1.0) * clamp(sun.z, 0.0, 1.0);
			vTerra = terra;
			vPos   = pos;
			
			getShadowVerts(shadowmats, pos, vShadowverts);
			
			/*test =
				vAO == 1.0  ? vec3(1,1,1) :
				vAO == 0.75 ? vec3(1,1,0) :
				vAO == 0.5  ? vec3(1,0,0) :
				vAO == 0.25 ? vec3(0,0,0) :
				vec3(0);*/
		</color>
	}
`;

const frag = `	
	<color>
		uniform sampler2D shadowmaps[<layers>];
		uniform sampler2D tex;
		uniform vec3 campos;
		uniform vec3 sunPos;
		uniform sampler2D skymap;
		varying vec3 vPos, vNorm;
		varying float vAO, vDiff, vTerra;
		varying vec4 vShadowverts[<layers>];
		varying vec3 test;
	</color>
	
	${glsl.shadow}
	${glsl.fogged}
	${glsl.getSkyFrag}
	
	void main()
	{
		gl_FragColor = vec4(1);
		
		<color>
			vec2 uv = vNorm.x < 0.0 ? vPos.yz * vec2(-1,+1) :
				      vNorm.x > 0.0 ? vPos.yz * vec2(+1,+1) :
				      vNorm.y < 0.0 ? vPos.xz * vec2(+1,+1) :
				      vNorm.y > 0.0 ? vPos.xz * vec2(-1,+1) :
				      vNorm.z < 0.0 ? vPos.xy * vec2(+1,-1) :
				      vNorm.z > 0.0 ? vPos.xy * vec2(+1,+1) :
				      vec2(0);
			
			gl_FragColor = texture2D(tex, (fract(uv * vec2(1,-1)) + vec2(vTerra, 0)) / 16.0);
			gl_FragColor.rgb *= mix(vAO, vDiff, 0.5);
			gl_FragColor.rgb *= mix(shadow(shadowmaps, vShadowverts), 1.0, 0.5);
			gl_FragColor.rgb = fogged(gl_FragColor.rgb, vPos, campos, getSkyFrag(skymap, vec3(1,0,0), sunPos) );
			
			//gl_FragColor.rgb *= test;
		</color>
	}
`;

const layout = [
	["quadStart", 2],
	["quadSize", 2],
	["layer", 1],
	["afs", 1],
	["terra", 1],
	["aoval", 1]
];

export default class Map
{
	constructor(gl)
	{
		this.getVoxel     = this.getVoxel.bind(this);
		this.getFullVoxel = this.getFullVoxel.bind(this);
		
		this.gl          = gl;
		this.generator   = new Worker("./src/generator.js", {type: "module"});
		this.mesher      = new Worker("./src/mesher.js", {type: "module"});
		this.tex         = gl.texture("./gfx/atlas.png");
		this.shader      = gl.shader("mediump", vert, frag, {color: true, layers: 3});
		this.shaderNocol = gl.shader("mediump", vert, frag, {color: false, layers: 3});
		this.quads       = gl.buffer({usage: "dynamic", type: "ubyte", divisor: 1, layout: layout});
		this.tree        = new Model(gl, "./meshes/tree2.mesh");
		this.batch       = new Batch(this.tree);
		this.mesh        = [];
		this.generating  = 0;
		this.changed     = false;
		this.remeshed    = false;
		
		this.generator.onmessage = e => this.onGenerated(e.data.cx, e.data.cy, e.data.data);
		this.mesher.onmessage    = e => this.onMeshed(e.data.cx, e.data.cy, e.data.mesh);
		
		this.quad = gl.buffer({
			type: "ubyte",
			layout: [["baseQuad", 2], ["flipQuad", 2]],
			data: [0,0,1,0, 1,0,1,1, 0,1,0,0, 1,1,0,1],
		});
		
		this.chunks = Array(16 * 16).fill().map((j,i) => ({
			data: [0, 0],
			mesh: [],
			changed: false,
			cx: i % 16, cy: ~~(i / 16),
		}));
		
		for(let cy = 0; cy < 16; cy ++) {
			for(let cx = 0; cx < 16; cx ++) {
				this.regen(cx, cy);
			}
		}
		
		for(let y=0; y<256; y++)
			for(let x=0; x<256; x++)
				;//this.setVoxel(x,y,0,1);
	}
	
	isInside(x, y, z)
	{
		return x >= 0 && y >= 0 && z >= 0 && x < 256 && y < 256 && z < 256;
	}
	
	isChunkInside(cx, cy)
	{
		return cx >= 0 && cy >= 0 && cx < 16 && cy < 16;
	}
	
	localBlockIndex(x, y, z)
	{
		return x % 16 + y % 16 * 16 + z * 16 * 16;
	}
	
	getChunk(cx, cy)
	{
		if(this.isChunkInside(cx, cy)) {
			return this.chunks[cx + cy * 16];
		}
		
		return nullchunk;
	}
	
	getChunkAt(x, y)
	{
		return this.getChunk(~~(x / 16), ~~(y / 16))
	}
	
	getVoxel(x, y, z)
	{
		if(this.isInside(x, y, z)) {
			let ch = this.getChunkAt(x, y);
			return intervalFind(ch.data, this.localBlockIndex(x, y, z));
		}
		else if(z < 0) {
			return 1;
		}
		
		return 0;
	}
	
	getFullVoxel(x, y, z)
	{
		let v = this.getVoxel(x, y, z);
		return (v >> 8 & 0xf) ? 0 : v;
	}
	
	setChanged(cx, cy)
	{
		this.changed = true;
		
		for(     let y = -1, i = 0; y <= +1; y ++       ) {
			for( let x = -1;        x <= +1; x ++, i ++ ) {
				this.getChunk(cx + x, cy + y).changed = true;
			}
		}
	}
	
	setVoxel(x, y, z, v)
	{
		if(this.isInside(x, y, z)) {
			let ch = this.getChunkAt(x, y);
			this.setChanged(ch.cx, ch.cy);
			intervalPlace(ch.data, this.localBlockIndex(x, y, z), v, 16 * 16 * 256);
			
			if(v >> 8 === 0b1111) {
				this.batch.add(x, y, z);
			}
		}
	}
	
	regen(cx, cy)
	{
		this.generating ++;
		this.generator.postMessage({cx, cy});
	}
	
	onGenerated(cx, cy, data)
	{
		let ch = this.getChunk(cx, cy);
		ch.data = data.slice();
		this.setChanged(ch.cx, ch.cy);
		this.generating --;
		let ox = cx * 16;
		let oy = cy * 16;
		
		for(let z=0; z<256; z++) {
			for(let y=0; y<16; y++) {
				for(let x=0; x<16; x++) {
					let v = this.getVoxel(ox + x, oy + y, z);
					
					if(v >> 8 === 0b1111) {
						this.setVoxel(ox + x, oy + y, z, v);
					}
				}
			}
		}
	}
	
	remesh(cx, cy)
	{
		let vicinity = Array(9);
		
		for(     let y = -1, i = 0; y <= +1; y ++       ) {
			for( let x = -1;        x <= +1; x ++, i ++ ) {
				vicinity[i] = this.getChunk(cx + x, cy + y).data;
			}
		}
		
		this.mesher.postMessage({cx, cy, vicinity});
	}
	
	onMeshed(cx, cy, mesh)
	{
		let ch        = this.getChunk(cx, cy);
		ch.mesh       = mesh;
		this.remeshed = true;
	}
	
	update()
	{
		if(this.changed && this.generating === 0) {
			this.changed = false;
			
			this.chunks.forEach(chunk => {
				if(chunk.changed) {
					chunk.changed = false;
					this.remesh(chunk.cx, chunk.cy);
				}
			});
		}
		
		if(this.remeshed) {
			this.remeshed = false;
			this.mesh     = [];
			
			this.chunks.forEach(chunk => {
				this.mesh.push(...chunk.mesh);
			});
			
			this.quads.update(this.mesh);
		}
		
		this.batch.update();
	}
	
	draw(camera, sky, shadow, colored = true)
	{
		let quadcount = this.mesh.length / 8;
		
		if(quadcount) {
			this.gl.enable(this.gl.DEPTH_TEST);
			this.gl.disable(this.gl.CULL_FACE);
			
			if(colored) {
				this.shader.draw("trianglestrip", 4, quadcount, {
					mat: camera.mat,
					sun: sky.sun,
					campos: camera.pos,
					buffers: [this.quads, this.quad],
					tex: this.tex,
					shadowmaps: shadow.textures,
					shadowmats: shadow.matrices,
					sunPos: sky.sun,
					skymap: sky.colormap,
				});
			}
			else {
				this.shaderNocol.draw("trianglestrip", 4, quadcount, {
					mat: camera.mat,
					buffers: [this.quads, this.quad],
				});
			}
		}
		
		this.batch.draw(camera, sky, this.shadow, colored);
	}
}
