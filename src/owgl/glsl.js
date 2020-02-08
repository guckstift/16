export const diffuse = `
	float diffuse(vec3 norm, vec3 light)
	{
		return clamp(dot(norm, light), 0.0, 1.0);
	}
	
	float sunlight(vec3 norm, vec3 sun)
	{
		return diffuse(norm, sun) * clamp(sun.z, 0.0, 1.0);
	}
`;
