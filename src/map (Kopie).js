import Chunk from "./chunk.js";

export default class Map
{
	constructor(w, h, d, cw, ch, cd)
	{
		this.getVoxel = this.getVoxel.bind(this);
		this.getFullVoxel = this.getFullVoxel.bind(this);
		this.w = w;
		this.h = h;
		this.d = d;
		this.cx = w / cw;
		this.cy = h / ch;
		this.cz = d / cd;
		this.cw = cw;
		this.ch = ch;
		this.cd = cd;
		this.chunks = {};
	}
	
	chunkId(cx, cy, cz)
	{
		return `${cx}_${cy}_${cz}`;
	}
	
	getChunk(cx, cy, cz)
	{
		return this.chunks[this.chunkId(cx, cy, cz)];
	}
	
	getVoxel(x, y, z)
	{
		let cx = Math.floor(x / this.cw);
		let cy = Math.floor(y / this.ch);
		let cz = Math.floor(z / this.cd);
		let ch = this.getChunk(cx, cy, cz);
		
		if(ch) {
			return ch.getVoxel(x - ch.x, y - ch.y, z - ch.z);
		}
		
		return 0;
	}
	
	isSolid(x, y, z)
	{
		return this.getVoxel(x, y, z) > 0;
	}
	
	getSlope(x, y, z)
	{
		return this.getVoxel(x, y, z) >> 8;
	}
	
	getFullVoxel(x, y, z)
	{
		let vox = this.getVoxel(x, y, z);
		
		if(vox & 0xff00) {
			vox = 0;
		}
		
		return vox;
	}
	
	setVoxel(x, y, z, v)
	{
		let cx = Math.floor(x / this.cw);
		let cy = Math.floor(y / this.ch);
		let cz = Math.floor(z / this.cd);
		let ch = this.getChunk(cx, cy, cz);
		
		if(ch) {
			return ch.setVoxel(x - ch.x, y - ch.y, z - ch.z, v);
		}
	}
	
	insertChunk(ch)
	{
		let cx = Math.floor(ch.x / this.cw);
		let cy = Math.floor(ch.y / this.ch);
		let cz = Math.floor(ch.z / this.cd);
		let id = this.chunkId(cx, cy, cz);
		this.chunks[id] = ch;
	}
	
	touchChunk(cx, cy, cz)
	{
		let id = this.chunkId(cx, cy, cz);
		
		this.chunks[id] = this.chunks[id] || new Chunk(
			cx * this.cw,
			cy * this.ch,
			cz * this.cd,
			this.cw,
			this.ch,
			this.cd,
			this
		);
	}
	
	draw(camera, sky)
	{
		Object.values(this.chunks).forEach(chunk => chunk.draw(camera, sky));
	}
}
