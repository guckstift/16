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
		//tiles: [0, 0, 0, 0, 0, 0],
		tiles: [4, 4, 4, 4, 4, 4],
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
	return blocks[block];
}

export function isSolidBlock(block)
{
	return blocks[block].solid;
}

export function isVisibleBlock(block)
{
	return blocks[block].visible;
}

export function getBlockTile(block, fid)
{
	return blocks[block].tiles[fid];
}
