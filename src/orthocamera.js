import Camera from "./camera.js";
import mat4 from "./mat4.js";

export default class OrthoCamera extends Camera
{
	constructor(scale = 1, aspect = 1, near = 0.1, far = 1000)
	{
		super(90, aspect, near, far);
		
		this.scale = scale;
	}
	
	get proj()
	{
		return mat4.ortho(this.scale, this.aspect, this.near, this.far, true);
	}
}
