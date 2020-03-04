import NoiseLayer from "./noiselayer.js";

export default class Compo
{
	constructor(...configs)
	{
		this.layers = configs.map(([scale, amp, seed]) => new NoiseLayer(scale, amp, seed));
	}
	
	sample(x, y)
	{
		return this.layers.reduce((a,c) => a + c.sample(x, y), 0)
	}
}
