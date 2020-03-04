import Map from "./map.js";
import Sky from "./sky.js";
import Ground from "./ground.js";
import Cascade from "./cascade.js";

export default class World
{
	constructor(gl, shadow)
	{
		this.map = new Map(gl);
		this.sky = new Sky(gl);
		this.ground = new Ground(gl);
		this.shadow = new Cascade(gl, shadow);
	}
	
	update(delta)
	{
		this.sky.update(delta);
		this.map.update();
	}
	
	draw(cam)
	{
		this.shadow.generate(cam, this.sky, layer => {
			this.ground.draw(layer.camera, this.sky, null, false);
			this.map.draw(layer.camera, this.sky, null, false);
		});
		
		this.sky.draw(cam);
		this.ground.draw(cam, this.sky);
		this.map.draw(cam, this.sky, this.shadow);
	}
}
