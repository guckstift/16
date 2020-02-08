const greaterZero = x => x > 0;

let voxels = [];
let slopes = [];
let aomap = [];
let count = 0;
let i = new Float64Array(3);
let j = new Float64Array(3);

export default function slopes(dims, voxi, slopei, vis = greaterZero)
{
	let count = 0;
	let size = dims[0] * dims[1] * dims[2];
	
	for(let i=0; i<size; i++) {
		voxels[i] = voxi(i);
		
		if(vis(voxels[i]) {
			slopes[i] = slopei(i);
			aomap[i] = 0;
		}
		else {
			slopes[i] = 0;
			aomap[i] = 0;
		}
	}
	
	mergeFaces();
	
	if(count < quads.length) {
		quads.splice(count);
	}
	
	return quads;
}

function mergeFaces(b)
{
	for(         i[2] = 0; i[2] !== b[2]; i[2] ++ ) {
		for(     i[1] = 0; i[1] !== b[1]; i[1] ++ ) {
			for( i[0] = 0; i[0] !== b[0]; i[0] ++ ) {
				let I = voxelIndex(i,b[0],b[1]);
				
				if(faces[I]) {
					j[1] = i[1];
					j[2] = i[2];
					
					for(j[0] = i[0] + 1; j[0] !== b[0]; j[0] ++) {
						let J = voxelIndex(j,b[0],b[1]);
						
						if(!slopes[J] || voxels[I] !== voxels[J] || aomap[I] !== aomap[J]) {
							break;
						}
						
						slopes[J] = 0;
					}
					
					let j0 = j[0];
					
					outer:
					for(     j[1] = i[1] + 1; j[1] !== b[1]; j[1] ++ ) {
						for( j[0] = i[0];     j[0] !== j0;   j[0] ++ ) {
							let J = voxelIndex(j,b[0],b[1]);
							
							if(!slopes[J] || voxels[I] !== voxels[J] || aomap[I] !== aomap[J]) {
								break outer;
							}
						}
						
						for( j[0] = i[0];     j[0] !== j0;   j[0] ++ ) {
							slopes[voxelIndex(j,b[0],b[1])] = 0;
						}
					}
					
					quads[count++] = i[0];        // quad start x
					quads[count++] = i[1];        // ... y
					quads[count++] = j0 - i[0];   // quad size x
					quads[count++] = j[1] - i[1]; // ... y
					quads[count++] = i[2];        // quad layer z
					quads[count++] = slopes[I];
					quads[count++] = voxels[I];
					quads[count++] = aomap[I];
				}
			}
		}
	}
}
