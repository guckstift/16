export default function mesher(dims, vis, occ, equ, slope, emit)
{
	let I, J, ao0, ao1, ao2, ao00, ao10, ao01, ao11;
	let i = new Float64Array(3);
	let j = new Float64Array(3);
	let k = new Float64Array(3);
	
	for(let ax2 = 0; ax2 < 3; ax2 ++) {
		for(let a = -1; a <= +1; a += 2) {
			let ax1   = (ax2 + a + 3) % 3;
			let ax0   = 3 - ax1 - ax2;
			let nx    = ax2 !== 0 ? 0 : ax1 === 2 ? +1 : -1;
			let ny    = ax2 !== 1 ? 0 : ax1 === 0 ? +1 : -1;
			let nz    = ax2 !== 2 ? 0 : ax1 === 1 ? +1 : -1;
			let a2p   = (ax2 === 0 ? nx : ax2 == 1 ? ny : nz) > 0;
			let len   = dims[ax0] * dims[ax1];
			let map   = new Uint8Array(len);
			let aomap = new Uint8Array(len);
			let flips = new Uint8Array(len);
			
			for(         i[ax2] = 0;        i[ax2] < dims[ax2]; i[ax2] ++       ) {
				for(     i[ax1] = 0, I = 0; i[ax1] < dims[ax1]; i[ax1] ++       ) {
					for( i[ax0] = 0;        i[ax0] < dims[ax0]; i[ax0] ++, I ++ ) {
						j[0] = i[0] + nx;
						j[1] = i[1] + ny;
						j[2] = i[2] + nz;
						
						if(map[I] = vis(i[0], i[1], i[2]) && !occ(j[0], j[1], j[2])) {
							j[ax0] --; ao0 = occ(j[0], j[1], j[2]);
							j[ax1] --; ao1 = occ(j[0], j[1], j[2]);
							j[ax0] ++; ao2 = occ(j[0], j[1], j[2]);
							ao00 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
							
							           ao0 = ao2;
							j[ax0] ++; ao1 = occ(j[0], j[1], j[2]);
							j[ax1] ++; ao2 = occ(j[0], j[1], j[2]);
							ao10 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
							
							           ao0 = ao2;
							j[ax1] ++; ao1 = occ(j[0], j[1], j[2]);
							j[ax0] --; ao2 = occ(j[0], j[1], j[2]);
							ao11 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
							
							           ao0 = ao2;
							j[ax0] --; ao1 = occ(j[0], j[1], j[2]);
							j[ax1] --; ao2 = occ(j[0], j[1], j[2]);
							ao01 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
							
							aomap[I] = ao00 | ao10 << 2 | ao01 << 4 | ao11 << 6;
							flips[I] = ao00 + ao11 > ao10 + ao01 ? 1 : 0;
						}
					}
				}
				
				for(     i[ax1] = 0, I = 0; i[ax1] < dims[ax1]; i[ax1] ++       ) {
					for( i[ax0] = 0;        i[ax0] < dims[ax0]; i[ax0] ++, I ++ ) {
						if(map[I]) {
							j[ax1] = i[ax1];
							j[ax2] = i[ax2];
							k[ax2] = i[ax2];
							
							for(     j[ax0] = i[ax0] + 1; j[ax0] < dims[ax0]; j[ax0] ++ ) {
								J = j[ax0] + j[ax1] * dims[ax0];
								
								if(!equ(i, j) || aomap[I] !== aomap[J]) {
									break;
								}
								
								map[J] = 0;
							}
							
							outer:
							for(     k[ax1] = i[ax1] + 1; k[ax1] < dims[ax1]; k[ax1] ++ ) {
								for( k[ax0] = i[ax0];     k[ax0] < j[ax0];    k[ax0] ++ ) {
									J = k[ax0] + k[ax1] * dims[ax0];
									
									if(!equ(i, k) || aomap[I] !== aomap[J]) {
										break outer;
									}
								}
								
								for( k[ax0] = i[ax0];     k[ax0] < j[ax0];    k[ax0] ++ ) {
									map[k[ax0] + k[ax1] * dims[ax0]] = 0;
								}
							}
							
							emit(
								ax0, ax1, ax2,                    // axes
								i[ax0],          i[ax1],          // quad start
								j[ax0] - i[ax0], k[ax1] - i[ax1], // quad size
								i[ax2] + a2p,                     // layer
								i, aomap[I], flips[I],            // vox, ao, flip
							);
						}
					}
				}
			}
		}
	}
}
