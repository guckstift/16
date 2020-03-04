export default [
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
		tiles: [3, 3, 3, 3, 1, 2],
	},
	{
		name: "sand",
		occluding: true,
		solid: true,
		visible: true,
		tiles: [4, 4, 4, 4, 4, 4],
	},
	{
		name: "object",
		occluding: false,
		solid: true,
		visible: false,
	},
];
