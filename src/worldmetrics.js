import {mod} from "../gluck/math.js";

export const CHUNK_BITS  = 4;
export const CHUNK_WIDTH = 1 << CHUNK_BITS;
export const CHUNK_SIZE  = CHUNK_WIDTH ** 3;

export const WORLD_BITS         = 1;
export const WORLD_CHUNKS_WIDTH = 1 << WORLD_BITS;
export const WORLD_CHUNKS_SIZE  = WORLD_CHUNKS_WIDTH ** 3;

export const WORLD_WIDTH = WORLD_CHUNKS_WIDTH * CHUNK_WIDTH;
export const WORLD_SIZE  = WORLD_WIDTH ** 3;

export function localBlockIndex(x, y, z)
{
	return (((z << CHUNK_BITS) + y) << CHUNK_BITS) + x;
}

export function localBlockX(i)
{
	return (i >> CHUNK_BITS * 0) % CHUNK_WIDTH;
}

export function localBlockY(i)
{
	return (i >> CHUNK_BITS * 1) % CHUNK_WIDTH;
}

export function localBlockZ(i)
{
	return (i >> CHUNK_BITS * 2) % CHUNK_WIDTH;
}

export function blockToChunk(c)
{
	return c >> CHUNK_BITS;
}

export function localBlock(c)
{
	return mod(c, CHUNK_WIDTH);
}

export function localChunkIndex(x, y, z)
{
	return (((z << WORLD_BITS) + y) << WORLD_BITS) + x;
}
