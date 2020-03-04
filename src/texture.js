let gldts = new WeakMap();

export default function texture(gl, width, height, filter, src, format)
{
	if(typeof width !== "number") {
		[width, height, filter, src, format] = [undefined, undefined, width, height, filter];
	}
	
	if(!["nearest", "linear"].includes(filter)) {
		[filter, src, format] = ["nearest", filter, src];
	}
	
	filter = {
		nearest: gl.NEAREST,
		linear: gl.LINEAR,
	}[filter];
	
	format = format || "rgba";
	
	let type = format === "depth" ? gl.UNSIGNED_SHORT : gl.UNSIGNED_BYTE;
	let gldt = getGldt(gl);
	
	format = {
		rgba: gl.RGBA,
		depth: gl.DEPTH_COMPONENT,
	}[format];
	
	if(Array.isArray(src)) {
		src = new Uint8Array(src);
	}
	else if(!src) {
		src = null;
	}
	
	let tex  = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	if(typeof width === "number") {
		gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, src);
	}
	else if(typeof src === "string") {
		let img = document.createElement("img");
		img.src = src;
		gl.texImage2D(gl.TEXTURE_2D, 0, format, 1, 1, 0, format, type, null);
		
		img.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, img);
		};
	}
	else if(src) {
		gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, src);
	}
	
	return tex;
}

function getGldt(gl)
{
	let gldt = gldts.get(gl);
	
	if(!gldt) {
		gldt = gl.getExtension("WEBGL_depth_texture");
		gldts.set(gl, gldt);
	}
	
	return gldt;
}
