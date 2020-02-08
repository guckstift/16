export default function texture(gl, width, height, filter, src)
{
	if(typeof width !== "number") {
		[width, height, filter, src] = [undefined, undefined, width, height];
	}
	
	if(!["nearest", "linear"].includes(filter)) {
		[filter, src] = ["nearest", filter];
	}
	
	filter = {
		nearest: gl.NEAREST,
		linear: gl.LINEAR,
	}[filter];
	
	if(Array.isArray(src)) {
		src = new Uint8Array(src);
	}
	else if(!src) {
		src = null;
	}
	
	let tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	
	if(typeof width === "number") {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
	}
	else if(typeof src === "string") {
		let img = document.createElement("img");
		img.src = src;
		img.onload = () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	}
	else if(src) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
	}
	
	return tex;
}
