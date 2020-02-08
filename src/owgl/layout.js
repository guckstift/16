const datasizes = {
	byte:   1,
	ubyte:  1,
	short:  2,
	ushort: 2,
	float:  4,
};

export default function layout(buffer, type, divisor, ...fields)
{
	let stride = 0;
	let attribs = {};
	
	if(typeof divisor !== "number") {
		fields.unshift(divisor);
		divisor = 0;
	}
	
	if(typeof type !== "string") {
		if(typeof type === "number") {
			divisor = type;
		}
		else {
			fields.unshift(type);
		}
		
		type = "float";
	}
	
	let datasize = datasizes[type];
	
	fields.forEach(field => {
		if(field) {
			let [name, count] = field;
			let size = datasize * count;
			let offset = stride;
			attribs[name] = {name, buffer, type, offset, divisor};
			stride += size;
		}
	});
	
	for(let name in attribs) {
		attribs[name].stride = stride;
	}
	
	return attribs;
}
