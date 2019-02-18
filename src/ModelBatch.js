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
	
	update()
	{
		if(this.modified) {
			this.buf.update(this.data);
			this.modified = false;
		}
	}
	
	draw(camera, sun)
	{
		this.model.draw([0, 0, 0], camera, sun, this.buf);
	}
}

let instLayout = new VertexLayout("float", ["ipos", 3]);
