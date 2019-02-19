import {World} from "./World.js";
import {NoiseLayer2d} from "./NoiseLayer2d.js";

import {
	CHUNK_SIZE, CHUNK_WIDTH, WORLD_WIDTH, WORLD_CHUNKS_WIDTH,
	localBlockIndex, localBlockX, localBlockY, localBlockZ,	globalBlockIndex
} from "./worldmetrics.js";

let worker   = null;
let callback = null;
let world    = null;

export function generateWorld(display, fn)
{
	world    = new World(display);
	callback = fn;
	
	worker.postMessage("start");
	
	return world;
}

if(typeof window === "object") {
	worker = new Worker("./bundles/generator.js");
	
	worker.onmessage = e => {
		world.deserialize(e.data);
		callback();
	};
}
else {
	let heightlayers = [
		new NoiseLayer2d(2,  1,  12345),
		new NoiseLayer2d(16, 16, 23451),
		new NoiseLayer2d(64, 64, 34512),
	];

	let heightmap = new Uint8Array(WORLD_WIDTH ** 2);
	let chunkbuf  = new Uint16Array(CHUNK_SIZE);
	
	onmessage = e => {
		postMessage(generateWorldImpl());
	};

	function generateWorldImpl()
	{
		let world = new World();
		let now   = performance.now();
		let delta = 0;
		
		generateHeightmap();
		
		delta = performance.now() - now;
		console.log("generateHeightmap time:", delta);
		now = performance.now();
		
		generateBaseTerrain(world);
		
		delta = performance.now() - now;
		console.log("generateBaseTerrain time:", delta);
		now = performance.now();
		
		generateSlopes(world);
		
		delta = performance.now() - now;
		console.log("generateSlopes time:", delta);
		now = performance.now();
		
		//generateTrees(world);
		
		return world;
	}

	function generateHeightmap()
	{
		for(let z=0, i=0; z < WORLD_WIDTH; z++) {
			for(let x=0; x < WORLD_WIDTH; x++, i++) {
				heightmap[i] = Math.floor(
					heightlayers.reduce((a,c) => a + c.sample(x, z), 0)
				);
			}
		}
	}

	function getHeight(x, z)
	{
		return heightmap[z * WORLD_WIDTH + x];
	}

	function generateBaseTerrain(world)
	{
		world.forEachChunk(({chunk, ox, oy, oz}) => {
			chunk.forEachBlock(({i, x, y, z}) => {
				let gx = ox + x;
				let gy = oy + y;
				let gz = oz + z;
				let h  = getHeight(gx, gz);
				
				if(gy < h) {
					chunkbuf[i] = 2;
				}
				else if(gy === h) {
					chunkbuf[i] = 3;
				}
				else if(gy === h + 1 && Math.random() < 0.001 * h) {
					chunkbuf[i] = 4;
					world.trees.push(gx);
					world.trees.push(gy);
					world.trees.push(gz);
				}
				else {
					chunkbuf[i] = 0;
				}
			});
			
			chunk.packFrom(chunkbuf);
		});
	}

	function generateSlopes(world)
	{
		world.forEachBlockPos(({x, y, z}) => {
			let h = getHeight(x, z);
			
			if(y - 1 === h
				&& getHeight(x, z + 1) > h
				&& getHeight(x - 1, z) >= h
				&& getHeight(x + 1, z) >= h
			) {
				putSlope(world, x,   y, z, 0b1100);
				putSlope(world, x-1, y, z, 0b1000);
				putSlope(world, x+1, y, z, 0b0100);
			}
			if(y - 1 === h
				&& getHeight(x, z - 1) > h
				&& getHeight(x - 1, z) >= h
				&& getHeight(x + 1, z) >= h
			) {
				putSlope(world, x,   y, z, 0b0011);
				putSlope(world, x-1, y, z, 0b0010);
				putSlope(world, x+1, y, z, 0b0001);
			}
			if(y - 1 === h
				&& getHeight(x + 1, z) > h
				&& getHeight(x, z - 1) >= h
				&& getHeight(x, z + 1) >= h
			) {
				putSlope(world, x, y, z,   0b1010);
				putSlope(world, x, y, z-1, 0b1000);
				putSlope(world, x, y, z+1, 0b0010);
			}
			if(y - 1 === h
				&& getHeight(x - 1, z) > h
				&& getHeight(x, z - 1) >= h
				&& getHeight(x, z + 1) >= h
			) {
				putSlope(world, x, y, z,   0b0101);
				putSlope(world, x, y, z-1, 0b0100);
				putSlope(world, x, y, z+1, 0b0001);
			}
		});
	}

	function putSlope(world, x, y, z, sl)
	{
		if(!world.isSolidBlock(x, y, z) || world.getBlockSlope(x, y, z) > 0) {
			world.setBlock(x, y, z, world.getBlockId(x, y - 1, z), sl, true);
		}
	}
}
