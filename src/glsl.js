export const diffuse = `
	float diffuse(vec3 norm, vec3 light)
	{
		return clamp(dot(norm, light), 0.0, 1.0);
	}
`;

export const sunlight = `
	float sunlight(vec3 norm, vec3 sun)
	{
		return diffuse(norm, sun) * clamp(sun.z, 0.0, 1.0);
	}
`;

export const getShadowVerts = `
	void getShadowVerts(mat4 shadowmats[<layers>], vec3 pos, out vec4[<layers>] verts)
	{
		for(int i=0; i < <layers> ; i++) {
			verts[i] = shadowmats[i] * vec4(pos, 1);
		}
	}
`;

export const shadow = `
	float shadow(sampler2D[<layers>] depthmap, vec4[<layers>] verts)
	{
		for(int i=0; i < <layers> ; i++) {
			vec4 smpPos = verts[i];
			vec2 uv     = (smpPos.xy + vec2(1)) * 0.5;
			vec4 sample = texture2D(depthmap[i], uv);
			float depth = sample.r * 2.0 - 1.0;
			
			if(uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0) {
				return depth > smpPos.z - 1.0 / 4096.0 ? 1.0 : 0.0;
			}
		}
		
		return 1.0;
	}
`;

export const fogged = `
	vec3 fogged(vec3 frag, vec3 pos, vec3 campos, vec3 fogCol)
	{
		//fogCol = vec3(0.75, 0.875, 1.0);
		
		float coef = 1.0 - exp(
			-distance(pos, campos) * 0.0625 * max(0.0, (1.0 - pos.z / 80.0))
		);
		
		coef *= 0.875;
		
		return mix(frag, fogCol, coef);
	}
`;

export const getSkyFrag = `
	vec3 getSkyFrag(sampler2D colormap, vec3 norm, vec3 sunPos)
	{
		return texture2D(
			colormap,
			vec2(
				clamp(0.5 - sunPos.z * 0.5, 0.0, 1.0),
				clamp(1.0 - norm.z, 0.0, 1.0)
			)
		).rgb;
	}
`;
