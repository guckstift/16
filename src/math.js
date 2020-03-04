export function mod(x, m)
{
	return (x % m + m) % m;
}

export function frac(x)
{
	return x - Math.floor(x);
}

export function radians(d)
{
	return d * Math.PI / 180;
}

export function degrees(r)
{
	return r * 180 / Math.PI;
}

export function clamp(val, minval, maxval)
{
	return Math.max(minval, Math.min(maxval, val));
}

export function lerp(x, a, b)
{
	return a + x * (b - a);
}

export function smooth(a, b, x)
{
	return a + x * x * (3 - 2 * x) * (b - a);
}

export function smoother(x)
{
	return x * x * x * (x * (x * 6 - 15) + 10);
}

export function xorshift(x)
{
	x ^= x << 13;
	x ^= x >>> 17;
	x ^= x << 5;
	return x >>> 0;
}
