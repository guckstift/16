export class ChunkData
{
	constructor(width, height, depth)
	{
		this.width  = width;
		this.height = height;
		this.depth  = depth;
		this.size   = width * height * depth;
		this.data   = [0, 0];
	}
	
	isUniform()
	{
		return this.data.length === 2;
	}
	
	getUniform()
	{
		return this.data[1];
	}
	
	blockIndex(p)
	{
		return (p[2] * this.depth + p[1]) * this.height + p[0];
	}
	
	intervalIndex(i)
	{
		let p = 0;
		let j = 0;
		let s = 0;
		let e = this.data.length >> 1;
		
		while(s + 1 < e) {
			p = (s + e) >> 1;
			j = this.data[p << 1];
			
			if(j > i) {
				e = p;
			}
			else if(j < i) {
				s = p;
			}
			else {
				return p << 1;
			}
		}
		
		return s << 1;
	}
	
	intervalSearch(i)
	{
		return this.data[this.intervalIndex(i) + 1];
	}
		
	getBlock(p)
	{
		return this.intervalSearch(this.blockIndex(p));
	}
	
	intervalPlace(i, v)
	{
		let data = this.data;
		let len  = data.length;
		let ii   = intervalIndex(data, i);
		let is   = data[ii];
		let iv   = data[ii + 1];
		let ie   = ii + 2 < len ? data[ii + 2] : this.size;
		
		if(v !== iv) {
			if(i === is) {
				if(is + 1 === ie) {
					if(ii > 0 && data[ii - 1] === v) {
						if(ii + 3 < len && data[ii + 3] === v) {
							data.splice(ii, 4);
						}
						else {
							data.splice(ii, 2);
						}
					}
					else if(ii + 3 < len && data[ii + 3] === v) {
						data.splice(ii + 2, 2);
						data[ii + 1] = v;
					}
					
				}
				else if(ii > 0 && data[ii - 1] === v) {
					data[ii]++;
				}
				else {
					data.splice(ii + 1, 0, v, is + 1);
				}
			}
			else if(i === ie - 1) {
				if(ii + 3 < len && data[ii + 3] === v) {
					data[ii + 2]--;
				}
				else {
					data.splice(ii + 2, 0, i, v);
				}
			}
			else {
				data.splice(ii + 2, 0, i, v, i + 1, iv);
			}
		}
	}
	
	setBlock(p, v)
	{
		this.intervalPlace(this.blockIndex(p), v);
	}
	
	intervalForEach(fn)
	{
		let data = this.data;
		let len  = data.length;
		let ii   = 0;
		let is   = 0;
		let iv   = 0;
		let ie   = 0;
		
		while(ii < len) {
			is  = data[ii];
			iv  = data[ii + 1];
			ii += 2;
			ie  = ii < len ? data[ii] : this.size;
			fn(iv, is, ie);
		}
	}
	
	forEach(fn)
	{
		this.intervalForEach(this.data, (iv, is, ie) => {
			for(let i = is; i < ie; i++) {
				fn(iv, i);
			}
		});
	}
	
	load(data)
	{
		this.data = Array.from(data);
	}
	
	clear()
	{
		this.load([0, 0]);
	}
	
	unpack(buf)
	{
		this.intervalForEach((iv, is, ie) => {
			buf.fill(iv, is, ie);
		});
	}
	
	pack(buf)
	{
		this.clear();
		
		buf.forEach((v, i) => {
			this.intervalPlace(i, v);
		});
	}
}
