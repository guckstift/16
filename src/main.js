let canvas = document.createElement("canvas");
let gl = canvas.getContext("webgl");

document.body.append(canvas);
canvas.style.position = "absolute";
canvas.style.left = "0";
canvas.style.top = "0";
canvas.style.width = "100vw";
canvas.style.height = "100vh";

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

requestAnimationFrame(function frame()
{
	let w = canvas.clientWidth;
	let h = canvas.clientHeight;
	
	if(canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}
	
	requestAnimationFrame(frame);
});
