let x, y, z, ax0, ax1, ax2, a2p, a, I, J, ao, fl, ao0, ao1, ao2, ao00, ao10, ao01, ao11;
let i     = new Float64Array(3);
let j     = new Float64Array(3);
let k     = new Float64Array(3);
let n     = new Float64Array(3);
let map   = [];
let aomap = [];
let flips = [];

export default function mesher(dims, vis, cov, equ, emit)
{
	for(ax2 = 0; ax2 < 3; ax2 ++) {
		for(a = -1; a <= +1; a += 2) {
			ax1  = (ax2 + a + 3) % 3;
			ax0  = 3 - ax1 - ax2;
			n[0] = ax2 !== 0 ? 0 : ax1 === 2 ? +1 : -1;
			n[1] = ax2 !== 1 ? 0 : ax1 === 0 ? +1 : -1;
			n[2] = ax2 !== 2 ? 0 : ax1 === 1 ? +1 : -1;
			a2p  = n[ax2] > 0;
			
			for(         i[ax2] = 0;        i[ax2] < dims[ax2]; i[ax2] ++       ) {
				for(     i[ax1] = 0, I = 0; i[ax1] < dims[ax1]; i[ax1] ++       ) {
					for( i[ax0] = 0;        i[ax0] < dims[ax0]; i[ax0] ++, I ++ ) {
						if(map[I] = vis(i) && !cov(i, n)) {
							j[0] = i[0] + n[0];
							j[1] = i[1] + n[1];
							j[2] = i[2] + n[2];
							
							j[ax0] --; ao0 = vis(j);
							j[ax1] --; ao1 = vis(j);
							j[ax0] ++; ao2 = vis(j);
							ao00 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
							
							           ao0 = ao2;
							j[ax0] ++; ao1 = vis(j);
							j[ax1] ++; ao2 = vis(j);
							ao10 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
							
							           ao0 = ao2;
							j[ax1] ++; ao1 = vis(j);
							j[ax0] --; ao2 = vis(j);
							ao11 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
							
							           ao0 = ao2;
							j[ax0] --; ao1 = vis(j);
							j[ax1] --; ao2 = vis(j);
							ao01 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
							
							aomap[I] = ao00 | ao10 << 2 | ao01 << 4 | ao11 << 6;
							flips[I] = ao00 + ao11 > ao10 + ao01;
						}
					}
				}
				
				for(     i[ax1] = 0, I = 0; i[ax1] < dims[ax1]; i[ax1] ++       ) {
					for( i[ax0] = 0;        i[ax0] < dims[ax0]; i[ax0] ++, I ++ ) {
						if(map[I]) {
							ao     = aomap[I];
							fl     = flips[I];
							j[ax1] = i[ax1];
							j[ax2] = i[ax2];
							k[ax2] = i[ax2];
							
							for(     j[ax0] = i[ax0] + 1; j[ax0] < dims[ax0]; j[ax0] ++ ) {
								J = j[ax0] + j[ax1] * dims[ax0];
								
								if(!equ(i, j) || ao !== aomap[J]) {
									break;
								}
								
								map[J] = 0;
							}
							
							outer:
							for(     k[ax1] = i[ax1] + 1; k[ax1] < dims[ax1]; k[ax1] ++ ) {
								for( k[ax0] = i[ax0];     k[ax0] < j[ax0];    k[ax0] ++ ) {
									J = k[ax0] + k[ax1] * dims[ax0];
									
									if(!equ(i, k) || ao !== aomap[J]) {
										break outer;
									}
								}
								
								for( k[ax0] = i[ax0];     k[ax0] < j[ax0];    k[ax0] ++ ) {
									map[k[ax0] + k[ax1] * dims[ax0]] = 0;
								}
							}
							
							emit(ax0, ax1, ax2, i, j, k, n, ao, fl);
						}
					}
				}
			}
		}
	}
}
