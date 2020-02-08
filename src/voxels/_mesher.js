const greaterZero = x => x > 0;
const firstByte = x => x >> 0 & 0xff;
const secondByte = x => x >> 8 & 0xff;

let voxels = [];
let faces = [];
let aomap = [];
let flips = [];
let slmap = [];
let quads = [];
let slopes = [];
let result = {quads, slopes};
let count = 0;
let slcnt = 0;
let i = new Float64Array(3);
let j = new Float64Array(3);

export default function mesh({dims, vox, vis = greaterZero, occ = greaterZero, type = firstByte, slope = secondByte})
{
	loadVoxels(dims, vox,vis,slope);
	createFaces(dims, vox,vis,occ,type,slope);
	createSlopes(dims, type,slope);
	outputMesh();
	return result;
}

function loadVoxels(b, vox,vis,slope)
{
	for(         let z = 0, i = 0; z < b[2]; z++      ) {
		for(     let y = 0;        y < b[1]; y++      ) {
			for( let x = 0;        x < b[0]; x++, i++ ) {
				let voxel = voxels[i] = vox(x,y,z);
				slmap[i]  = vis(voxel) ? slope(voxel) : 0;
			}
		}
	}
}

function createFaces(dims, vox,vis,occ,type,slope)
{
	count = 0;
	createFacesSide(1,2, dims, vox,vis,occ,type,slope); // right
	createFacesSide(2,1, dims, vox,vis,occ,type,slope); // left
	createFacesSide(2,0, dims, vox,vis,occ,type,slope); // back
	createFacesSide(0,2, dims, vox,vis,occ,type,slope); // front
	createFacesSide(0,1, dims, vox,vis,occ,type,slope); // top
	createFacesSide(1,0, dims, vox,vis,occ,type,slope); // bottom
}

function createFacesSide(ax0,ax1, b, vox,vis,occ,type,slope)
{
	let ax2  = 3 - ax0 - ax1;
	let nx   = ax0 === 1 && ax1 === 2 ? +1 : ax0 === 2 && ax1 === 1 ? -1 : 0;
	let ny   = ax0 === 2 && ax1 === 0 ? +1 : ax0 === 0 && ax1 === 2 ? -1 : 0;
	let nz   = ax0 === 0 && ax1 === 1 ? +1 : ax0 === 1 && ax1 === 0 ? -1 : 0;
	let ax2p = (ax2 === 0 ? nx : ax2 == 1 ? ny : nz) > 0;
	computeFacesSide(ax0,ax1, nx,ny,nz, b, vox,vis,occ,slope);
	mergeFacesSide(ax0,ax1,ax2, ax2p, b, type);
}

function computeFacesSide(ax0,ax1, nx,ny,nz, b, vox,vis,occ,slope)
{
	for(         let z = 0, i = 0; z < b[2]; z++      ) {
		for(     let y = 0;        y < b[1]; y++      ) {
			for( let x = 0;        x < b[0]; x++, i++ ) {
				let here = voxels[i];
				let face = facevis(here, x,y,z, nx,ny,nz, vox,vis,occ,slope);
				faces[i] = face;
				
				if(face) {
					let {ao, flip} = computeFaceAO(ax0,ax1, x,y,z, nx,ny,nz, vox,occ);
					aomap[i] = ao;
					flips[i] = flip;
				}
				else {
					aomap[i] = 0;
					flips[i] = 0;
				}
			}
		}
	}
}

function mergeFacesSide(ax0,ax1,ax2, ax2p, b, type)
{
	for(         i[ax2] = 0; i[ax2] !== b[ax2]; i[ax2] ++ ) {
		for(     i[ax1] = 0; i[ax1] !== b[ax1]; i[ax1] ++ ) {
			for( i[ax0] = 0; i[ax0] !== b[ax0]; i[ax0] ++ ) {
				let I = voxelIndex(i,b[0],b[1]);
				
				if(faces[I]) {
					j[ax1] = i[ax1];
					j[ax2] = i[ax2];
					
					for(j[ax0] = i[ax0] + 1; j[ax0] !== b[ax0]; j[ax0] ++) {
						let J = voxelIndex(j,b[0],b[1]);
						
						if(facesUnequal(I, J)) {
							break;
						}
						
						faces[J] = 0;
					}
					
					let j0 = j[ax0];
					
					outer:
					for(     j[ax1] = i[ax1] + 1; j[ax1] !== b[ax1]; j[ax1] ++ ) {
						for( j[ax0] = i[ax0];     j[ax0] !== j0;     j[ax0] ++ ) {
							let J = voxelIndex(j,b[0],b[1]);
							
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

function computeFaceAO(ax0,ax1, x,y,z, nx,ny,nz, vox,occ)
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
	
	return {ao, flip};
}

function createSlopes(b, type,slope)
{
	slcnt = 0;
	
	for(         i[2] = 0; i[2] !== b[2]; i[2] ++ ) {
		for(     i[1] = 0; i[1] !== b[1]; i[1] ++ ) {
			for( i[0] = 0; i[0] !== b[0]; i[0] ++ ) {
				let I = voxelIndex(i,b[0],b[1]);
				
				if(isSlope(I)) {
					j[1] = i[1];
					j[2] = i[2];
					
					for(j[0] = i[0] + 1; j[0] !== b[0]; j[0] ++) {
						let J = voxelIndex(j,b[0],b[1]);
						
						if(facesUnequal(I, J)) {
							break;
						}
						
						slmap[J] = 0;
					}
					
					let j0 = j[0];
					
					outer:
					for(     j[1] = i[1] + 1; j[1] !== b[1]; j[1] ++ ) {
						for( j[0] = i[0];     j[0] !== j0;     j[0] ++ ) {
							let J = voxelIndex(j,b[0],b[1]);
							
							if(facesUnequal(I, J)) {
								break outer;
							}
						}
						
						for( j[0] = i[0];     j[0] !== j0;     j[0] ++ ) {
							slmap[voxelIndex(j,b[0],b[1])] = 0;
						}
					}
					
					slopes[slcnt++] = i[0];        // slope start x
					slopes[slcnt++] = i[1];        // ... y
					slopes[slcnt++] = j0 - i[0];   // slope size x
					slopes[slcnt++] = j[1] - i[1]; // ... y
					slopes[slcnt++] = i[2];        // slope layer z
					slopes[slcnt++] = slmap[I];
					slopes[slcnt++] = type(voxels[I]);
					slopes[slcnt++] = 0;
				}
			}
		}
	}
}

function outputMesh()
{
	if(count < quads.length) {
		quads.splice(count);
	}
	
	if(slcnt < slopes.length) {
		slopes.splice(count);
	}
}

function voxelIndex(p,w,h)
{
	return (p[2] * h + p[1]) * w + p[0];
}

function facesEqual(i, j)
{
	return voxels[i] === voxels[j] && aomap[i] === aomap[j];
}

function facesUnequal(i, j)
{
	return voxels[i] !== voxels[j] || aomap[i] !== aomap[j];
}

function slopesUnequal(i, j)
{
	return !slmap[j] || voxels[i] !== voxels[j] || aomap[i] !== aomap[j];
}

function isSlope(i)
{
	let sl = slmap[i];
	return sl === 0b0011 || sl === 0b1100 || sl === 0b0101 || sl === 0b1010;
}

function isCorner(sl)
{
	return sl === 0b0001 || sl === 0b0010 || sl === 0b0100 || sl === 0b1000 ||
	       sl === 0b1110 || sl === 0b1101 || sl === 0b1011 || sl === 0b0111 ;
}

function facevis(here, x,y,z, nx,ny,nz, vox,vis,occ,slope)
{
	if(!vis(here) || slope(here)) {
		return false;
	}
	
	let adj = vox(x + nx, y + ny, z + nz);
	
	if(!occ(adj)) {
		return true;
	}
	
	let sl = slope(adj);
	
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
