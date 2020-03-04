import vec3 from "./vec3.js";

export default class Box
{
	constructor(start, end)
	{
		this.start = start;
		this.end = end;
	}
	
	overlap(other)
	{
		return (
			this.start[0] <= other.end[0] && this.end[0] >= other.start[0] &&
			this.start[1] <= other.end[1] && this.end[1] >= other.start[1] &&
			this.start[2] <= other.end[2] && this.end[2] >= other.start[2]
		);
	}
	
	collide(vel, other)
	{
		let invEnter = vec3();
		let invExit  = vec3();
		let enter    = vec3();
		let exit     = vec3();
		
		for(let i=0; i<3; i++) {
			if(vel[i] > 0) {
				invEnter[i] = other.start[i] - this.end[i];
				invExit[i]  = other.end[i] - this.start[i];
			}
			else {
				invEnter[i] = other.end[i] - this.start[i];
				invExit[i]  = other.start[i] - this.end[i];
			}
			
			if(vel[i] === 0) {
				enter[i] = -Infinity;
				exit[i]  = +Infinity;
			}
			else {
				enter[i] = invEnter[i] / vel[i];
				exit[i]  = invExit[i] / vel[i];
			}
		}
		
		let enterTime = Math.max(enter[0], enter[1], enter[2]);
		let exitTime  = Math.min(exit[0], exit[1], exit[2]);
		
		if(
			enterTime > exitTime ||
			enter[0] < 0 && enter[1] < 0 && enter[2] < 0 ||
			enter[0] > 1 && enter[1] > 1 && enter[2] > 1
		) {
			return;
		}
		
		if(enter[0] > enter[1] && enter[0] > enter[2]) {
			return {axis: 0};
		}
		else if(enter[1] > enter[2]) {
			return {axis: 1};
		}
		else {
			return {axis: 2};
		}
	}
}
