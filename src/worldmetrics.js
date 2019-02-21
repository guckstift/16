import {mod} from "../gluck/math.js";

export const CHUNK_BITS_H = 8;
export const CHUNK_BITS_W = 4;
export const CHUNK_HEIGHT = 1 << CHUNK_BITS_H;
export const CHUNK_WIDTH  = 1 << CHUNK_BITS_W;
export const CHUNK_SIZE   = CHUNK_HEIGHT * CHUNK_WIDTH ** 2;

export function localBlockIndex(x, y, z)
{
	return (((z << CHUNK_BITS_W) + x) << CHUNK_BITS_H) + y;
}

export function localBlockY(i)
{
	return i % CHUNK_HEIGHT;
}

export function localBlockX(i)
{
	return (i >> CHUNK_BITS_H) % CHUNK_WIDTH;
}

export function localBlockZ(i)
{
	return (i >> (CHUNK_BITS_W + CHUNK_BITS_H)) % CHUNK_WIDTH;
}

export const WORLD_BITS_W       = 4;
export const WORLD_CHUNKS_W     = 1 << WORLD_BITS_W;
export const WORLD_CHUNKS_COUNT = WORLD_CHUNKS_W ** 2;
export const WORLD_WIDTH        = WORLD_CHUNKS_W * CHUNK_WIDTH;

export function blockToChunk(c)
{
	return c >> CHUNK_BITS_W;
}

export function localBlock(c)
{
	return mod(c, CHUNK_WIDTH);
}

export function localChunkIndex(x, z)
{
	return (z << WORLD_BITS_W) + x;
}
