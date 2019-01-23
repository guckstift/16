export class Emitter
{
	constructor()
	{
		this.events = {};
	}
	
	listeners(event)
	{
		if(!this.events[event]) {
			this.events[event] = [];
		}
		
		return this.events[event];
	}
	
	on(event, cb)
	{
		this.listeners(event).push(cb);
	}
	
	off(event, cb)
	{
		let listeners = this.listeners(event);
		let index     = listeners.indexOf(cb)
		
		if(index > -1) {
			listeners.splice(index, 1);
		}
	}
	
	trigger(event, ...data)
	{
		this.listeners(event).forEach(cb => cb(...data));
	}
}
