export default class Emitter
{
	constructor()
	{
		this.map = new Map();
	}
	
	on(owner, event, cb)
	{
		if(!this.map.has(owner)) {
			this.map.set(owner, {});
		}
		
		this.map.get(owner)[event] = cb;
	}
	
	off(owner)
	{
		if(this.map.has(owner)) {
			this.map.set(owner, {});
		}
	}
	
	emit(event, data)
	{
		this.map.forEach((events, owner) => {
			if(events[event]) {
				events[event](data);
			}
		});
	}
}
