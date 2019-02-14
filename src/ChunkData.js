import {CHUNK_SIZE, localBlockIndex} from "./worldmetrics.js";

export class ChunkData
{
	constructor()
	{
		this.data     = [0, 0];
		this.modified = false;
	}
	
	isUniform()
	{
		return this.data.length === 2;
	}
	
	getUniform()
	{
		return this.isUniform() ? this.data[1] : undefined;
	}
	
	getUniformId()
	{
		return this.isUniform() ? this.data[1] & 0xff: undefined;
	}
	
	getUniformSlope()
	{
		return this.isUniform() ? this.data[1] << 8 & 0xf: undefined;
	}
	
	getBlock(x, y, z)
	{
		return intervalSearch(this.data, localBlockIndex(x, y, z));
	}
	
	getBlockId(x, y, z)
	{
		return this.getBlock(x, y, z) & 0xff;
	}
	
	getBlockSlope(x, y, z)
	{
		return this.getBlock(x, y, z) >> 8 & 0xf;
	}
	
	isModified()
	{
		return this.modified;
	}
	
	forEach(fn)
	{
		intervalForEachBlock(this.data, (v, i, id, sl) => {
			fn(v, i, id, sl);
		});
	}
	
	unpackTo(buf)
	{
		intervalForEach(this.data, (iv, is, ie) => {
			buf.fill(iv, is, ie);
		});
	}
	
	update()
	{
		this.modified = false;
	}
	
	setBlock(x, y, z, id = undefined, sl = undefined, addsl = false)
	{
		intervalPlace(this.data, localBlockIndex(x, y, z), id, sl, addsl);
		this.modified = true;
	}
	
	setBlockSlope(x, y, z, sl)
	{
		this.setBlock(x, y, z, undefined, sl);
	}
	
	addBlockSlope(x, y, z, sl)
	{
		this.setBlock(x, y, z, undefined, sl, true);
	}
	
	packFrom(buf)
	{
		this.data     = [0, 0];
		this.modified = true;
		
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

function intervalPlace(data, i, id = undefined, sl = undefined, addsl = false)
{
	let len = data.length;
	let ii  = intervalIndex(data, i);
	let is  = data[ii];
	let iv  = data[ii + 1];
	let iid = iv >> 0 & 0xff;
	let isl = iv >> 8 & 0x0f;
	let csl = (isl | sl) === 0b1111 ? 0 : (isl | sl);
	let vid = id === undefined ? iid : id;
	let vsl = sl === undefined ? isl : addsl ? csl : sl;
	let v   = vid + (vsl << 8);
	let ie  = ii + 2 < len ? data[ii + 2] : CHUNK_SIZE;
	
	// value is new
	if(v !== iv) {
		// index is first in interval
		if(i === is) {
			// index is last in interval (interval has length 1)
			if(is + 1 === ie) {
				// previous interval has the new value
				if(ii > 0 && data[ii - 1] === v) {
					// next interval has the new value (can merge from prev to next interval)
					if(ii + 3 < len && data[ii + 3] === v) {
						data.splice(ii, 4);
					}
					// next interval hasn't the new value (can merge prev with cur interval)
					else {
						data.splice(ii, 2);
					}
				}
				// previous interval hasn't the new value
				else {
					//data.splice(ii + 2, 2);
					data[ii + 1] = v;
				}
			}
			// previous interval has the new value
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
			fn(iv, i, iv & 0xff, iv >> 8 & 0xf);
		}
	});
}
