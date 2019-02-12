const blocks = [
	{
		name: "air",
		solid: false,
		visible: false,
	},
	{
		name: "stone",
		solid: true,
		visible: true,
		tiles: [0, 0, 0, 0, 0, 0],
	},
	{
		name: "soil",
		solid: true,
		visible: true,
		tiles: [1, 1, 1, 1, 1, 1],
	},
	{
		name: "grass",
		solid: true,
		visible: true,
		tiles: [3, 3, 2, 1, 3, 3],
	},
];

export function getBlockInfo(block)
{
	return blocks[block & 0xff];
}

export function isSolidBlock(block)
{
	return blocks[block & 0xff].solid;
}

export function isVisibleBlock(block)
{
	return blocks[block & 0xff].visible;
}

export function getBlockTile(block, fid)
{
	return blocks[block & 0xff].tiles[fid];
}

export function getBlockSlope(block)
{
	return block >> 8 & 0xf;
}
