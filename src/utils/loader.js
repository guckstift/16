let cache = {};

export function image(url)
{
	let promise = cache[url];
	
	if(!promise) {
		let img = document.createElement("img");
		img.src = url;
		
		promise = new Promise((res, rej) => {
			img.onload = () => res(img);
		});
	}
	
	return promise;
}
