export class VertexLayout
{
	constructor(type, ...fields)
	{
		this.type   = type;
		this.fields = {};
		this.names  = [];
		this.stride = 0;
		
		this.datasize = {
			"byte":   1,
			"ubyte":  1,
			"short":  2,
			"ushort": 2,
			"float":  4,
		}[type];
		
		this.arraytype = {
			"byte":   Int8Array,
			"ubyte":  Uint8Array,
			"short":  Int16Array,
			"ushort": Uint16Array,
			"float":  Float32Array,
		}[type];
		
		fields.forEach(field => {
			this.fields[field[0]] = {
				size:   field[1],
				offset: this.stride,
			};
			
			this.names.push(field[0]);
			this.stride += this.datasize * field[1];
		});
	}
	
	getType()
	{
		return this.type;
	}
	
	getArrayType()
	{
		return this.arraytype;
	}
	
	getDataSize()
	{
		return this.datasize;
	}
	
	getNames()
	{
		return this.names;
	}
	
	getStride()
	{
		return this.stride;
	}
	
	getSize(field)
	{
		return this.fields[field].size;
	}
	
	getOffset(field)
	{
		return this.fields[field].offset;
	}
}
