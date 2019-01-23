import {NoiseLayer} from "./NoiseLayer.js";

export class Generator
{
	constructor()
	{
		this.layer = new NoiseLayer(0, 2, 2, 12345);
	}
	
	sample(x, y, z)
	{
		return this.layer.sample(x, y, z);
	}
}
