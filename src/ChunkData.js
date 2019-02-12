import {CHUNK_SIZE, localBlockIndex, localBlockX, localBlockY, localBlockZ}
	from "./worldmetrics.js";

export class ChunkData
{
	constructor()
	{
		this.data = [0, 0];
	}
	
	isUniform()
	{
		return this.data.length === 2;
	}
	
	getUniform()
	{
		return this.data[1];
	}
	
	getBlock(x, y, z)
	{
		return intervalSearch(this.data, localBlockIndex(x, y, z));
	}
	
	setBlock(x, y, z, v, s = 0)
	{
		intervalPlace(this.data, localBlockIndex(x, y, z), v | (s << 8));
	}
	
	forEach(fn)
	{
		intervalForEachBlock(this.data, (v, i) => {
			fn(v, i, localBlockX(i), localBlockY(i), localBlockZ(i));
		});
	}
	
	clear()
	{
		this.load([0, 0]);
	}
	
	load(data)
	{
		this.data = Array.from(data);
	}
	
	unpack(buf)
	{
		intervalForEach(this.data, (iv, is, ie) => {
			buf.fill(iv, is, ie);
		});
	}
	
	pack(buf)
	{
		this.clear();
		
		buf.forEach((v, i) => {
			intervalPlace(this.data, i, v);
		});
	}
}

function intervalIndex(data, i)
{
	let p = 0;
	let j = 0;
	let s = 0;
	let e = data.length >> 1;
	
	while(s + 1 < e) {
		p = (s + e) >> 1;
		j = data[p << 1];
		
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

function intervalSearch(data, i)
{
	return data[intervalIndex(data, i) + 1];
}

function intervalPlace(data, i, v)
{
	let len = data.length;
	let ii  = intervalIndex(data, i);
	let is  = data[ii];
	let iv  = data[ii + 1];
	let ie  = ii + 2 < len ? data[ii + 2] : CHUNK_SIZE;
	
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
				else {
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

function intervalForEach(data, fn)
{
	let len = data.length;
	let ii  = 0;
	let is  = 0;
	let iv  = 0;
	let ie  = 0;
	
	while(ii < len) {
		is  = data[ii];
		iv  = data[ii + 1];
		ii += 2;
		ie  = ii < len ? data[ii] : CHUNK_SIZE;
		fn(iv, is, ie);
	}
}

function intervalForEachBlock(data, fn)
{
	intervalForEach(data, (iv, is, ie) => {
		for(let i = is; i < ie; i++) {
			fn(iv, i);
		}
	});
}
