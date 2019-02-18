import {
	CHUNK_SIZE, CHUNK_WIDTH, localBlockIndex, localBlockX, localBlockY, localBlockZ
} from "./worldmetrics.js";

import {getBlockId, getBlockSlope} from "./blocks.js";

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
	
	forEachBlock(fn)
	{
		intervalForEachBlock(this.data, ({block, i}) => {
			fn({
				block, i,
				id:    getBlockId(block),
				slope: getBlockSlope(block),
				x:     localBlockX(i),
				y:     localBlockY(i),
				z:     localBlockZ(i),
			});
		});
	}
	
	forEachBlockPos(fn)
	{
		for(let z=0, i=0; z < CHUNK_WIDTH; z++) {
			for(let y=0; y < CHUNK_WIDTH; y++) {
				for(let x=0; x < CHUNK_WIDTH; x++, i++) {
					fn({x, y, z, i});
				}
			}
		}
	}
	
	unpackTo(buf)
	{
		intervalForEach(this.data, ({block, start, end}) => {
			buf.fill(block, start, end);
		});
	}
	
	update()
	{
		let modified = this.modified;
		
		this.modified = false;
		
		return modified;
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
	
	deserialize(plain)
	{
		this.data     = plain.data;
		this.modified = true;
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
	for(let i=0, i2=2, len = data.length; i < len; i += 2, i2 += 2) {
		fn({
			block: data[i + 1],
			start: data[i],
			end:   i2 < len ? data[i2] : CHUNK_SIZE,
		});
	}
}

function intervalForEachBlock(data, fn)
{
	intervalForEach(data, ({block, start, end}) => {
		for(let i = start; i < end; i++) {
			fn({block, i});
		}
	});
}
