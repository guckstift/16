let dim, vis, occ, slope, emit;
let count, ax0, ax1, ax2, nx, ny, nz, ax2p;
let faces  = [];
let aomap  = [];
let flips  = [];
let slopes = [];
let i = new Float64Array(3);
let j = new Float64Array(3);

export default function createMesh(dimensions, isVisible, isOccluding, getSlope, emitQuad)
{
	dim = dimensions;
	vis = isVisible;
	occ = isOccluding;
	slope = getSlope;
	emit = emitQuad;
	createFaces();
}

function createFaces()
{
	count = 0;
	createFacesSide(1,2); // right
	createFacesSide(2,1); // left
	createFacesSide(2,0); // back
	createFacesSide(0,2); // front
	createFacesSide(0,1); // top
	createFacesSide(1,0); // bottom
}

function createFacesSide(axis0, axis1)
{
	ax0  = axis0;
	ax1  = axis1;
	ax2  = 3 - ax0 - ax1;
	nx   = ax0 === 1 && ax1 === 2 ? +1 : ax0 === 2 && ax1 === 1 ? -1 : 0;
	ny   = ax0 === 2 && ax1 === 0 ? +1 : ax0 === 0 && ax1 === 2 ? -1 : 0;
	nz   = ax0 === 0 && ax1 === 1 ? +1 : ax0 === 1 && ax1 === 0 ? -1 : 0;
	ax2p = (ax2 === 0 ? nx : ax2 == 1 ? ny : nz) > 0;
	computeFacesSide();
	mergeFacesSide();
}

function computeFacesSide()
{
	for(         let z = 0, i = 0; z < dim[2]; z++      ) {
		for(     let y = 0;        y < dim[1]; y++      ) {
			for( let x = 0;        x < dim[0]; x++, i++ ) {
				let face = faces[i] = facevis(x,y,z);
				
				if(face) {
					let ao = computeFaceAO(x,y,z);
					aomap[i] = ao;
				}
				else {
					aomap[i] = 0;
				}
			}
		}
	}
}

function mergeFacesSide()
{
	for(         i[ax2] = 0; i[ax2] !== dim[ax2]; i[ax2] ++ ) {
		for(     i[ax1] = 0; i[ax1] !== dim[ax1]; i[ax1] ++ ) {
			for( i[ax0] = 0; i[ax0] !== dim[ax0]; i[ax0] ++ ) {
				let I = voxelIndex(i);
				
				if(faces[I]) {
					j[ax1] = i[ax1];
					j[ax2] = i[ax2];
					
					for(j[ax0] = i[ax0] + 1; j[ax0] !== dim[ax0]; j[ax0] ++) {
						let J = voxelIndex(j);
						
						if(facesUnequal(I, J)) {
							break;
						}
						
						faces[J] = 0;
					}
					
					let j0 = j[ax0];
					
					outer:
					for(     j[ax1] = i[ax1] + 1; j[ax1] !== dim[ax1]; j[ax1] ++ ) {
						for( j[ax0] = i[ax0];     j[ax0] !== j0;       j[ax0] ++ ) {
							let J = voxelIndex(j);
							
							if(facesUnequal(I, J)) {
								break outer;
							}
						}
						
						for( j[ax0] = i[ax0];     j[ax0] !== j0;     j[ax0] ++ ) {
							faces[voxelIndex(j,b[0],b[1])] = 0;
						}
					}
					
					quads[count++] = i[ax0];          // quad start (axe 0)
					quads[count++] = i[ax1];          // ... (axe 1)
					quads[count++] = j0 - i[ax0];     // quad size (axe 0)
					quads[count++] = j[ax1] - i[ax1]; // ... (axe 1)
					quads[count++] = i[ax2] + ax2p;   // quad layer (axe 2)
					quads[count++] = ax0 | ax1 << 2 | flips[I] << 4;
					quads[count++] = type(voxels[I]);
					quads[count++] = aomap[I];
				}
			}
		}
	}
}

function computeFaceAO(x,y,z)
{
	let ao0, ao1, ao2;
	
	j[0] = x + nx;
	j[1] = y + ny;
	j[2] = z + nz;
	
	j[ax0] --; ao0 = occ(vox(j[0], j[1], j[2]));
	j[ax1] --; ao1 = occ(vox(j[0], j[1], j[2]));
	j[ax0] ++; ao2 = occ(vox(j[0], j[1], j[2]));
	let ao00 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
	           ao0 = ao2;
	j[ax0] ++; ao1 = occ(vox(j[0], j[1], j[2]));
	j[ax1] ++; ao2 = occ(vox(j[0], j[1], j[2]));
	let ao10 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
	           ao0 = ao2;
	j[ax1] ++; ao1 = occ(vox(j[0], j[1], j[2]));
	j[ax0] --; ao2 = occ(vox(j[0], j[1], j[2]));
	let ao11 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
	           ao0 = ao2;
	j[ax0] --; ao1 = occ(vox(j[0], j[1], j[2]));
	j[ax1] --; ao2 = occ(vox(j[0], j[1], j[2]));
	let ao01 = ao0 && ao2 ? 0 : 3 - ao0 - ao1 - ao2;
	
	let ao   = ao00 | ao10 << 2 | ao01 << 4 | ao11 << 6;
	let flip = ao00 + ao11 > ao10 + ao01 ? 1 : 0;
	
	return ao | flip << 8;
}

function voxelIndex(p)
{
	return (p[2] * dim[1] + p[1]) * dim[0] + p[0];
}

function facevis(x,y,z)
{
	if(!vis(x,y,z) || slope(x,y,z)) {
		return false;
	}
	
	if(!occ(x + nx, y + ny, z + nz)) {
		return true;
	}
	
	let sl = slope(x + nx, y + ny, z + nz);
	
	if(!sl) {
		return false;
	}
	
	if(nx === +1 && (sl & 0b0101) === 0b0101 ||
	   nx === -1 && (sl & 0b1010) === 0b1010 ||
	   ny === +1 && (sl & 0b0011) === 0b0011 ||
	   ny === -1 && (sl & 0b1100) === 0b1100 ||
	   nz === +1
	) {
		return false;
	}
	
	return true;
}
