const blocks = [
	{
		name: "air",
		occluding: false,
		solid: false,
		visible: false,
	},
	{
		name: "stone",
		occluding: true,
		solid: true,
		visible: true,
		tiles: [0, 0, 0, 0, 0, 0],
	},
	{
		name: "soil",
		occluding: true,
		solid: true,
		visible: true,
		tiles: [1, 1, 1, 1, 1, 1],
	},
	{
		name: "grass",
		occluding: true,
		solid: true,
		visible: true,
		tiles: [3, 3, 2, 1, 3, 3],
	},
	{
		name: "object",
		occluding: false,
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

export function isOccludingBlock(id)
{
	return getBlockInfo(id).occluding;
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
