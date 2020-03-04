export default function vec3(x = 0, y = 0, z = 0, out = Array(3))
{
	out[0] = x;
	out[1] = y;
	out[2] = z;
	return out;
}

vec3.copy = function(src, out = Array(3))
{
	return vec3(
		src[0],
		src[1],
		src[2],
	out);
}

vec3.add = function(a, b, out = Array(3))
{
	return vec3(
		a[0] + b[0],
		a[1] + b[1],
		a[2] + b[2],
	out);
}

vec3.addScaled = function(a, b, s, out = Array(3))
{
	return vec3(
		a[0] + b[0] * s,
		a[1] + b[1] * s,
		a[2] + b[2] * s,
	out);
}

vec3.sub = function(a, b, out = Array(3))
{
	return vec3(
		a[0] - b[0],
		a[1] - b[1],
		a[2] - b[2],
	out);
}

vec3.mul = function(a, b, out = Array(3))
{
	return vec3(
		a[0] * b[0],
		a[1] * b[1],
		a[2] * b[2],
	out);
}

vec3.div = function(a, b, out = Array(3))
{
	return vec3(
		a[0] / b[0],
		a[1] / b[1],
		a[2] / b[2],
	out);
}

vec3.scale = function(v, s, out = Array(3))
{
	return vec3(
		v[0] * s,
		v[1] * s,
		v[2] * s,
	out);
}

vec3.normalize = function(v, out = Array(3))
{
	return vec3.scale(v, 1 / vec3.len(v), out);
}

vec3.rotateX = function(v, a, out = Array(3))
{
	let s = Math.sin(a);
	let c = Math.cos(a);
	let y = v[1];
	let z = v[2];
	out[0] = v[0];
	out[1] = y * c - z * s;
	out[2] = y * s + z * c;
	return out;
}

vec3.rotateY = function(v, a, out = Array(3))
{
	let s = Math.sin(a);
	let c = Math.cos(a);
	let x = v[0];
	let z = v[2];
	out[0] = x * c - z * s;
	out[1] = v[1];
	out[2] = x * s + z * c;
	return out;
}

vec3.rotateZ = function(v, a, out = Array(3))
{
	let s = Math.sin(a);
	let c = Math.cos(a);
	let x = v[0];
	let y = v[1];
	out[0] = x * c - y * s;
	out[1] = x * s + y * c;
	out[2] = v[2];
	return out;
}

vec3.transform = function(v, m, out = Array(3))
{
	let x = v[0], y = v[1], z = v[2];
	let rw = 1 / (x * m[3] + y * m[7] + z * m[11] + m[15]);
	
	return vec3(
		(x * m[0] + y * m[4] + z * m[8]  + m[12]) * rw,
		(x * m[1] + y * m[5] + z * m[9]  + m[13]) * rw,
		(x * m[2] + y * m[6] + z * m[10] + m[14]) * rw,
	out);
}

vec3.cross = function(a, b, out = Array(3))
{
	return vec3(
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	out);
}

vec3.dot = function(a, b)
{
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

vec3.squareLen = function(v)
{
	return vec3.dot(v, v);
}

vec3.len = function(v)
{
	return Math.sqrt(vec3.squareLen(v));
}

vec3.squareDist = function(a, b)
{
	return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

vec3.dist = function(a, b)
{
	return Math.sqrt(vec3.squareDist(a, b));
}
