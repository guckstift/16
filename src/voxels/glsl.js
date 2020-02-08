export const computePos = `
	vec3 computePos(vec2 baseQuad, vec2 flipQuad, vec2 quadStart, vec2 quadSize, float layer, float axesAndFlip)
	{
		float flip = floor(axesAndFlip * 0.0625);
		float axes = mod(axesAndFlip, 16.0);
		vec2 quad = flip == 0.0 ? baseQuad : flipQuad;
		vec2 axs = vec2(mod(axes, 4.0), floor(axes * 0.25));
		vec2 p2  = quadStart + quadSize * quad;
		
		return vec3(
			axs.x == 0.0 ? p2.x : axs.y == 0.0 ? p2.y : layer,
			axs.x == 1.0 ? p2.x : axs.y == 1.0 ? p2.y : layer,
			axs.x == 2.0 ? p2.x : axs.y == 2.0 ? p2.y : layer
		);
	}
`;

export const computeNorm = `
	vec3 computeNorm(float axesAndFlip)
	{
		float axes = mod(axesAndFlip, 16.0);
		
		return vec3(
			axes == 9.0 ? +1 : axes == 6.0 ? -1 : 0,
			axes == 2.0 ? +1 : axes == 8.0 ? -1 : 0,
			axes == 4.0 ? +1 : axes == 1.0 ? -1 : 0
		);
	}
`;

export const computeAO = `
	float computeAO(vec2 baseQuad, vec2 flipQuad, float axesAndFlip, float aoval)
	{
		float flip = floor(axesAndFlip * 0.0625);
		vec2 quad = flip == 0.0 ? baseQuad : flipQuad;
		float ao00 = mod(aoval, 4.0);
		aoval = floor(aoval * 0.25);
		float ao10 = mod(aoval, 4.0);
		aoval = floor(aoval * 0.25);
		float ao01 = mod(aoval, 4.0);
		aoval = floor(aoval * 0.25);
		float ao11 = mod(aoval, 4.0);
		
		return 0.25 + 0.25 * (
			quad.x == 0.0 ? quad.y == 0.0 ? ao00
		                                  : ao01
		                  : quad.y == 0.0 ? ao10
		                                  : ao11
		);
	}
`;

export const computeSlopePos = `
	vec3 computeSlopePos(vec2 baseQuad, vec2 slopeStart, vec2 slopeSize, float layer, float slope)
	{
		float sl00 = mod(slope, 2.0);
		slope = floor(slope * 0.5);
		float sl10 = mod(slope, 2.0);
		slope = floor(slope * 0.5);
		float sl01 = mod(slope, 2.0);
		slope = floor(slope * 0.5);
		float sl11 = mod(slope, 2.0);
		
		float z = baseQuad.x == 0.0 ? baseQuad.y == 0.0 ? sl00
		                                                : sl01
		                            : baseQuad.y == 0.0 ? sl10
		                                                : sl11
		;
		
		return vec3(slopeStart + baseQuad * slopeSize, layer + z);
	}
`;

export const computeSlopeNorm = `
	vec3 computeSlopeNorm(float slope)
	{
		const float s = sqrt(2.0) * 0.5;
		
		return slope ==  3.0 ? vec3( 0, s, s) :
		       slope == 12.0 ? vec3( 0,-s, s) :
		       slope ==  5.0 ? vec3( s, 0, s) :
		       slope == 10.0 ? vec3(-s, 0, s) :
		       vec3(0);
	}
`;
