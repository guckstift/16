export function intervalIndex(data, index)
{
	let start  = 0;
	let end    = data.length;
	let pivot  = 0;
	let istart = 0;
	
	while(start + 2 < end) {
		pivot  = (start + end) >> 2 << 1;
		istart = data[pivot];
		
		if(index < istart) {
			end = pivot;
		}
		else if(istart < index) {
			start = pivot;
		}
		else {
			return pivot;
		}
	}
	
	return start;
}

export function intervalFind(data, index)
{
	return data[intervalIndex(data, index) + 1];
}

export function intervalPlace(data, index, value, total)
{
	let length = data.length;
	let iindex = intervalIndex(data, index);
	let istart = data[iindex + 0];
	let ivalue = data[iindex + 1];
	let iend   = iindex + 2 < length ? data[iindex + 2] : total;
	
	if(value !== ivalue) { // value is new
		if(index === istart) { // first in interval
			if(istart + 1 === iend) { // interval has length 1
				if(data[iindex - 1] === value) { // previous interval has the new value
					if(data[iindex + 3] === value) { // next interval has the new value
						data.splice(iindex, 4); // can merge from prev to next interval
					}
					else { // next interval has different value
						data.splice(iindex, 2); // can merge prev with cur interval
					}
				}
				else { // previous interval has different value
					data[iindex + 1] = value; // change single value
				}
			}
			else { // interval is longer than 1
				if(data[iindex - 1] === value) { // previous interval has the new value
					data[iindex]++; // shift cur interval up
				}
				else { // previous interval has different value
					data.splice(iindex + 1, 0, value, istart + 1); // insert new single value
				}
			}
		}
		else if(index === iend - 1) { // last in interval
			if(data[iindex + 3] === value) { // next interval has the new value
				data[iindex + 2]--; // shift next interval down
			}
			else { // next interval has different value
				data.splice(iindex + 2, 0, index, value); // insert new single value
			}
		}
		else { // somewhere inbetween
			data.splice(iindex + 2, 0, index, value, index + 1, ivalue); // insert new single value
		}
	}
}
