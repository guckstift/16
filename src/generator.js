import Chunk from "./chunk.js";
import Perlin from "./utils/perlin.js";

export default class Generator
{
	constructor(gl, cw, ch, cd, map)
	{
		this.gl = gl;
		this.cw = cw;
		this.ch = ch;
		this.cd = cd;
		this.map = map;
		this.perlin = new Perlin();
	}
	
	genChunk(cx, cy, cz)
	{
		let ox = cx * this.cw;
		let oy = cy * this.ch;
		let oz = cz * this.cd;
		let heights = Array(this.cw * this.ch);
		
		let chunk = new Chunk(
			this.gl,
			ox, oy, oz,
			this.cw,
			this.ch,
			this.cd,
			this.map,
		);
		
		for(let y=0, i=0; y < this.ch; y++) {
			for(let x=0; x < this.cw; x++, i++) {
				let d = 8;
				let px = (ox + x) / d;
				let py = (oy + y) / d;
				let p = this.perlin.perlin2(px, py) * 0.5 + 0.5;
				heights[i] = Math.floor(p * 16);
			}
		}
		
		for(let z=0, i=0; z < this.cd; z++) {
			for(let y=0, j=0; y < this.ch; y++) {
				for(let x=0; x < this.cw; x++, i++, j++) {
					chunk.setVoxelIndex(i, z < heights[j] ? 1 + Math.random() * 2 : 0);
				}
			}
		}
		
		if(this.map) {
			this.map.insertChunk(chunk);
		}
		
		return chunk;
	}
}
