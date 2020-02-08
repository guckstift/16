export default class Map
{
	constructor()
	{
		this.data = new Uint8Array(256 * 256 * 256);
		
		this.chunks = Array(16 * 16).fill().map(() => {
			invalid: false,
			mesh: new Uint8Array(),
		});
	}
	
	chunkInside(cx, cy)
	{
		return cx >= 0 && cx < 16 && cy >= 0 && cy < 16;
	}
	
	chunkIndex(cx, cy)
	{
		return cx + cy * 16;
	}
	
	chunk(cx, cy)
	{
		if(this.chunkInside(cx, cy)) {
			return this.chunks[this.chunkIndex(cx, cy)];
		}
	}
	
	invalidateChunk(cx, cy)
	{
		let ch = this.chunk(cx, cy);
		
		if(ch) {
			ch.invalid = true;
		}
	}
	
	voxelInside(x, y, z)
	{
		return x >= 0 && x < 256 && y >= 0 && y < 256 && z >= 0 && z < 256;
	}
	
	voxelIndex(x, y, z)
	{
		return x + y * 256 + z * 256 * 256;
	}
	
	setVoxel(x, y, z, v)
	{
		if(this.voxelInside(x, y, z)) {
			this.data[this.voxelIndex(x, y, z)] = v;
			let cx = ~~(x / 16);
			let cy = ~~(y / 16);
			
			for(let ny = -1; ny <= +1; ny ++) {
				for(let nx = -1; nx <= +1; nx ++) {
					this.invalidateChunk(cx + nx, cy + ny);
				}
			}
		}
	}
	
	remesh()
	{
		for(let cy = 0, i = 0; cy < 16; cy ++) {
			for(let cx = 0; cx < 16; cx ++, i ++) {
				let ch = this.chunks[i];
				
				if(ch.invalid) {
					ch.invalid = false;
				}
			}
		}
	}
}
