const vert = `
	uniform mat4 mat;
	uniform vec3 sun;
	attribute vec2 baseQuad, flipQuad, quadStart, quadSize;
	attribute float layer, axesAndFlip, terra, aoval;
	varying vec3 vPos, vNorm;
	varying float vAO, vDiff, vTerra;
	
	void main()
	{
		float axes = mod(axesAndFlip, 16.0);
		
		vNorm = vec3(
			axes == 9.0 ? +1 : axes == 6.0 ? -1 : 0,
			axes == 2.0 ? +1 : axes == 8.0 ? -1 : 0,
			axes == 4.0 ? +1 : axes == 1.0 ? -1 : 0
		);
		
		float ax2p = vNorm.x + vNorm.y + vNorm.z > 0.0 ? 1.0 : 0.0;
		float flip = floor(axesAndFlip * 0.0625);
		vec2 quad  = flip == 0.0 ? baseQuad : flipQuad;
		vec2 axs   = vec2(mod(axes, 4.0), floor(axes * 0.25));
		vec2 size  = quadSize + vec2(1);
		vec2 p2    = quadStart + size * quad;
		
		vPos = vec3(
			axs.x == 0.0 ? p2.x : axs.y == 0.0 ? p2.y : layer + ax2p,
			axs.x == 1.0 ? p2.x : axs.y == 1.0 ? p2.y : layer + ax2p,
			axs.x == 2.0 ? p2.x : axs.y == 2.0 ? p2.y : layer + ax2p
		);
		
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
		
		vDiff       = clamp(dot(vNorm, sun), 0.0, 1.0) * clamp(sun.z, 0.0, 1.0);
		vTerra      = terra;
		gl_Position = mat * vec4(vPos, 1);
	}
`;

const frag = `
	uniform sampler2D tex;
	varying vec3 vPos, vNorm;
	varying float vAO, vDiff, vTerra;
	
	void main()
	{
		vec2 uv = vNorm.x != 0.0 ? vPos.yz :
		          vNorm.y != 0.0 ? vPos.xz :
		          vNorm.z != 0.0 ? vPos.xy :
		          vec2(0);
		
		gl_FragColor = texture2D(tex, (fract(uv) + vec2(vTerra - 1.0, 0)) / 16.0);
		gl_FragColor.rgb *= mix(vAO, vDiff, 0.5);
	}
`;

const layout = [
	["quadStart", 2],
	["quadSize", 2],
	["layer", 1],
	["axesAndFlip", 1],
	["terra", 1],
	["aoval", 1]
];

export default class Map
{
	constructor(gl, dims = [256,256,256], chunking = [16,16,1])
	{
		this.gl       = gl;
		this.dims     = dims;
		this.chunking = chunking;
		this.size     = dims[0] * dims[1] * dims[2];
		this.chcount  = chunking[0] * chunking[1] * chunking[2];
		this.data     = new Uint8Array(this.size);
		this.tex      = gl.texture("./gfx/atlas.png");
		this.shader   = gl.shader("mediump", vert, frag);
		this.quads    = gl.buffer({type: "ubyte", divisor: 1, layout: layout});
		this.chunks   = Array(this.chcount).fill().map(() => {data: []});
		
		this.quad = gl.buffer({
			type: "ubyte",
			layout: [["baseQuad", 2], ["flipQuad", 2]],
			data: [0,0,1,0, 1,0,1,1, 0,1,0,0, 1,1,0,1],
		});
	}
	
	getIndex(x, y, z)
	{
		return x + this.dims[0] * (y + this.dims[1] * z);
	}
	
	setVox(x, y, z, v)
	{
		this.data[this.getIndex(x, y, z)] = v;
	}
	
	generate()
	{
		for(let y = 0; y < this.dims[1]; y ++) {
			for(let x = 0; x < this.dims[0]; x ++) {
				this.setVox(x, y, 0, 1);
			}
		}
	}
	
	remesh(cx, cy, cz)
	{
	}
	
	isInside(x, y, z)
	{
		return x >= 0 && y >= 0 && z >= 0 && x < this.dims[0] && y < this.dims[1] && z < this.dims[2];
	}
	
	getVox(x, y, z)
	{
		return this.isInside(x, y, z) ? this.data[this.getIndex(x, y, z)] : 0;
	}
	
	getVoxP(p)
	{
		return this.getVox(...p);
	}
	
	setVoxP(p, v)
	{
		this.setVox(...p, v);
	}
	
	_generate()
	{
		for(let y = 0; y < this.dims[1]; y ++) {
			for(let x = 0; x < this.dims[0]; x ++) {
				let px = x / 32;
				let py = y / 32;
				let p  = this.perlin.perlin2(px, py) * 0.5 + 0.5;
				let h  = p * 64;
				
				for(let z = 0; z < h; z ++) {
					this.setVox(x, y, z, 1);
				}
			}
		}
	}
	
	_remesh()
	{
		let vis    = p => this.getVoxP(p) > 0;
		let cov    = ([x,y,z], [nx,ny,nz]) => this.getVox(x + nx, y + ny, z + nz) > 0;
		let equ    = (p, q) => this.getVoxP(p) === this.getVoxP(q);
		this.count = 0;
		
		let emit = (ax0, ax1, ax2, i, j, k, n, ao, fl) => {
			let offs = this.count * 8;
			this.mesh[offs + 0] = i[ax0];
			this.mesh[offs + 1] = i[ax1];
			this.mesh[offs + 2] = j[ax0] - i[ax0] - 1;
			this.mesh[offs + 3] = k[ax1] - i[ax1] - 1;
			this.mesh[offs + 4] = i[ax2];
			this.mesh[offs + 5] = ax0 | ax1 << 2 | fl << 4;
			this.mesh[offs + 6] = this.getVoxP(i);
			this.mesh[offs + 7] = ao;
			this.count ++;
		};
		
		let t0 = performance.now();
		mesher(this.dims, vis, cov, equ, emit);
		console.log(performance.now() - t0);
		this.quads.update(this.mesh);
	}
	
	_draw(camera, sky)
	{
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.disable(this.gl.CULL_FACE);
		
		this.shader.draw("trianglestrip", 4, this.count, {
			mat: camera.mat,
			sun: sky.sun,
			buffers: [this.quads, this.quad],
			tex: [this.tex, 0],
		});
	}
}
