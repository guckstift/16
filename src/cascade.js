import Shadow from "./shadow.js";

export default class Cascade
{
	constructor(gl, layers)
	{
		this.layers = layers.map(l => new Shadow(gl, l[0], l[1], l[2], l[3]));
		this.framecnt = 0;
	}
	
	get matrices()
	{
		return this.layers.map(l => l.camera.mat);
	}
	
	get textures()
	{
		return this.layers.map(l => l.depthtex);
	}
	
	generate(cam, sky, fn)
	{
		this.layers.forEach(shadow => {
			if(this.framecnt % shadow.throttle === 0) {
				shadow.update(cam, sky);
				shadow.begin();
				fn(shadow);
				shadow.end();
			}
		});
		
		this.framecnt++;
	}
}
