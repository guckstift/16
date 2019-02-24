import {VertexLayout} from "../gluck/VertexLayout.js";

export class ModelBatch
{
	constructor(model)
	{
		let display = model.display;
		
		this.model     = model;
		this.data      = [];
		this.display   = display;
		this.instances = 0;
		this.modified  = false;
		this.buf       = display.Buffer("dynamic", instLayout);
	}
	
	add(x, y, z)
	{
		this.data.push(x);
		this.data.push(y);
		this.data.push(z);
		this.modified = true;
	}
	
	update(data)
	{
		if(data || this.modified) {
			this.data = data;
			this.buf.update(this.data);
			this.modified = false;
		}
	}
	
	draw(camera, sun, shadows, depthOnly = false)
	{
		if(depthOnly) {
			this.model.drawDepth([0.5, 0, 0.5], camera, this.buf);
		}
		else {
			this.model.draw([0.5, 0, 0.5], camera, sun, shadows, this.buf);
		}
	}
}

let instLayout = new VertexLayout("float", ["ipos", 3]);
