import {World} from "./World.js";
import {NoiseLayer2d} from "./NoiseLayer2d.js";

import {WORLD_WIDTH, CHUNK_SIZE, CHUNK_WIDTH, CHUNK_HEIGHT} from "./worldmetrics.js";

let worker   = null;
let callback = null;
let world    = null;
let heightlayers;
let heightmap;
let chunkbuf;

export function generateWorld(display, fn)
{
	world    = new World(display);
	callback = fn;
	
	worker.postMessage({cmd: "generate"});
	
	return world;
}

export function loadWorld(display, src, fn)
{
	world    = new World(display);
	callback = fn;
	
	let img    = document.createElement("img");
	let canvas = document.createElement("canvas");
	
	img.onload = () => {
		canvas.width  = img.width;
		canvas.height = img.height;
		let ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0);
		let imgData = ctx.getImageData(0, 0, img.width, img.height);
		worker.postMessage({cmd: "load", pixels: imgData.data});
	};
	
	img.src = "worlds/" + src;
	
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
	heightlayers = [
		new NoiseLayer2d(2, 1, 12345),
		new NoiseLayer2d(16, 16, 23451),
		new NoiseLayer2d(64, 64, 34512),
	];

	heightmap = new Uint8Array(WORLD_WIDTH ** 2);
	chunkbuf = new Uint16Array(CHUNK_SIZE);

	onmessage = e => {
		if (e.data.cmd === "generate") {
			postMessage(generateWorldImpl());
		} else if (e.data.cmd === "load") {
			postMessage(loadWorldImpl(e.data.pixels));
		}
	};
}

function loadWorldImpl(pixels)
{
	let world = new World();
	let now   = performance.now();
	let delta;

	loadHeightmap(pixels);

	delta = performance.now() - now;
	console.log("loadHeightmap time:", delta);
	now = performance.now();

	generateBaseTerrain(world);

	delta = performance.now() - now;
	console.log("generateBaseTerrain time:", delta);
	now = performance.now();

	generateSlopes(world);

	delta = performance.now() - now;
	console.log("generateSlopes time:", delta);

	return world;
}

function loadHeightmap(pixels)
{
	for(let z=0, i=0; z < WORLD_WIDTH; z++) {
		for(let x=0; x < WORLD_WIDTH; x++, i++) {
			heightmap[i] = pixels[i * 4];
		}
	}
}

function generateWorldImpl()
{
	let world = new World();
	let now   = performance.now();
	let delta;

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
	world.forEachChunk(({chunk, ox, oz}) => {
		let maxh = 0;

		for(let z=0, i=0; z < CHUNK_WIDTH; z++) {
			for(let x=0; x < CHUNK_WIDTH; x++, i += CHUNK_HEIGHT) {
				let gx = ox + x;
				let gz = oz + z;
				let h  = getHeight(gx, gz);

				chunkbuf.fill(2, i,     i + h);
				chunkbuf.fill(0, i + h, i + CHUNK_HEIGHT);
				chunkbuf[i + h] = 3;

				if(Math.random() < 0.001 * h) {
					chunkbuf[i + h + 1] = 4;
					world.trees.push(gx);
					world.trees.push(h + 1);
					world.trees.push(gz);
				}

				maxh = Math.max(maxh, h + 1);
			}
		}

		chunk.setMaxHeight(maxh);
		chunk.packFrom(chunkbuf);
	});
}

function generateSlopes(world)
{
	for(let z=0; z < WORLD_WIDTH; z++) {
		for(let x=0; x < WORLD_WIDTH; x++) {
			let h = getHeight(x, z);
			let y = h + 1;

			if(getHeight(x, z + 1) > h) {
				let right = getHeight(x + 1, z);
				if(right > h) {
					putSlope(world, x, y, z, 0b1000);
				}
				else if(right === h) {
					let rdiag = getHeight(x + 1, z + 1);
					if(rdiag > h) {
						putSlope(world, x, y, z, 0b1000);
						putSlope(world, x + 1, y, z, 0b0100);
					}
					else if(rdiag === h) {
						putSlope(world, x, y, z, 0b1000);
						putSlope(world, x + 1, y, z, 0b0100);
						putSlope(world, x + 1, y, z + 1, 0b0001);
					}
				}
			}

			if(getHeight(x + 1, z) > h) {
				let right = getHeight(x, z - 1);
				if(right > h) {
					putSlope(world, x, y, z, 0b0010);
				}
				else if(right === h) {
					let rdiag = getHeight(x + 1, z - 1);
					if(rdiag > h) {
						putSlope(world, x, y, z, 0b0010);
						putSlope(world, x, y, z - 1, 0b1000);
					}
					else if(rdiag === h) {
						putSlope(world, x, y, z, 0b0010);
						putSlope(world, x, y, z - 1, 0b1000);
						putSlope(world, x + 1, y, z - 1, 0b0100);
					}
				}
			}

			if(getHeight(x, z - 1) > h) {
				let right = getHeight(x - 1, z);
				if(right > h) {
					putSlope(world, x, y, z, 0b0001);
				}
				else if(right === h) {
					let rdiag = getHeight(x - 1, z - 1);
					if(rdiag > h) {
						putSlope(world, x, y, z, 0b0001);
						putSlope(world, x - 1, y, z, 0b0010);
					}
					else if(rdiag === h) {
						putSlope(world, x, y, z, 0b0001);
						putSlope(world, x - 1, y, z, 0b0010);
						putSlope(world, x - 1, y, z - 1, 0b1000);
					}
				}
			}

			if(getHeight(x - 1, z) > h) {
				let right = getHeight(x, z + 1);
				if(right > h) {
					putSlope(world, x, y, z, 0b0100);
				}
				else if(right === h) {
					let rdiag = getHeight(x - 1, z + 1);
					if(rdiag > h) {
						putSlope(world, x, y, z, 0b0100);
						putSlope(world, x, y, z + 1, 0b0001);
					}
					else if(rdiag === h) {
						putSlope(world, x, y, z, 0b0100);
						putSlope(world, x, y, z + 1, 0b0001);
						putSlope(world, x - 1, y, z + 1, 0b0010);
					}
				}
			}
		}
	}
}

function putSlope(world, x, y, z, sl)
{
	world.setBlock(x, y, z, world.getBlockId(x, y - 1, z), sl, true);
}