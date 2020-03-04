export default class Batch
{
	constructor(model)
	{
		this.model = model;
		this.gl = model.gl;
		this.data = [];
		this.modified = false;
		this.buf = this.gl.buffer({type: "float", divisor: 1, layout: [["offs", 3]]});
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
	
	draw(camera, sky, colored = true)
	{
		if(this.data.length)
		this.model.batch(camera, sky, this.buf, this.data.length / 3, colored);
	}
}
