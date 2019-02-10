export let glsl = `
	float diffuseCoef(vec3 norm, vec3 sun)
	{
		return max(0.0, dot(norm, -sun));
	}
	
	vec3 obfuscate(float fogDist, vec3 fogCol, vec3 transPos, vec3 orgCol)
	{
		float fog = min(1.0, fogDist / length(transPos));
		
		return orgCol * fog + (1.0 - fog) * fogCol;
	}
`;
