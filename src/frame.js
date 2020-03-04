export default function frame(cb)
{
	let now = 0;
	let last = 0;
	let delta = 0;
	
	let id = requestAnimationFrame(function loop()
	{
		cb(delta / 1000);
		id = requestAnimationFrame(loop);
		now = performance.now();
		last = last || now;
		delta = now - last;
		last = now;
	});
	
	return () => cancelAnimationFrame(id);
}

frame.fps = function(cb)
{
	let now = 0;
	let last = 0;
	let frames = 0;
	
	let id = requestAnimationFrame(function loop()
	{
		id = requestAnimationFrame(loop);
		now = performance.now();
		last = last || now;
		frames += 1;
		
		if(now - last >= 1000) {
			cb(frames);
			last += 1000;
			frames = 0;
		}
	});
	
	return () => cancelAnimationFrame(id);
}
