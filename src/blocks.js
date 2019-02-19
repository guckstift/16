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
	{
		name: "object",
		solid: true,
		visible: false,
	},
];

export function getBlockId(block)
{
	return block & 0xff;
}

export function getBlockSlope(block)
{
	return block >> 8 & 0xf;
}

export function getBlockInfo(id)
{
	return blocks[id];
}

export function isSolidBlock(id)
{
	return getBlockInfo(id).solid;
}

export function isVisibleBlock(id)
{
	return getBlockInfo(id).visible;
}

export function getBlockTile(id, fid)
{
	return getBlockInfo(id).tiles[fid];
}
