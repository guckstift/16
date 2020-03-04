import frame from "./frame.js";

export default class Debugger
{
	constructor(world, body)
	{
		this.world = world;
		this.body = body;
		
		this.panel = document.createElement("div");
		this.panel.style.position = "absolute";
		this.panel.style.left = "16px";
		this.panel.style.top = "16px";
		this.panel.style.padding = "8px";
		this.panel.style.color = "#fff";
		this.panel.style.fontFamily = "monospace";
		this.panel.style.backgroundColor = "#0006";
		
		this.fpsLabel = document.createElement("div");
		this.fpsLabel.innerText = "framerate: ...";
		this.panel.append(this.fpsLabel);
	}
	
	start()
	{
		document.body.append(this.panel);
		
		this.frame = frame.fps(fps => {
			this.fpsLabel.innerText = "framerate: " + fps + " fps";
		});
	}
	
	stop()
	{
	}
}
