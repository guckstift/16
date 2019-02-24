import {ShadowMap} from "./ShadowMap.js";

export class ShadowCascade
{
	constructor(display, sun, drawfn)
	{
		this.display  = display;
		this.sun      = sun;
		this.drawfn   = drawfn;
		this.layers   = [];
		this.framecnt = 0;
	}
	
	addLayer(scale = 16, resol = 2048, throttle = 1, centered = false)
	{
		this.layers.push({
			throttle, centered,
			map: new ShadowMap(this.display, this.sun, scale, resol),
		});
	}
	
	getMap(i)
	{
		return this.layers[i].map;
	}
	
	getMaps()
	{
		return this.layers.map(l => l.map);
	}
	
	getMatrices()
	{
		return this.layers.map(l => l.map.getMatrix());
	}
	
	getDepthTexs()
	{
		return this.layers.map(l => l.map.getDepthTex());
	}
	
	update(centerPos)
	{
		this.layers.forEach(layer => {
			if(this.framecnt % layer.throttle === 0) {
				if(layer.centered) {
					layer.map.getCamera().setPos(centerPos);
				}
				
				layer.map.beginDraw();
				this.drawfn(layer.map.getCamera());
				layer.map.endDraw();
			}
		});
		
		this.framecnt++;
	}
}
