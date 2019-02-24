export const shadowVertSrc = `
	<color>
		const int layers = <layers>;
		
		uniform mat4 shadowMats[layers];
		
		varying vec3 vShadowVerts[layers];
	
		void setShadowVerts(mat4 model, vec3 pos)
		{
			for(int i = 0; i < layers; i++) {
				vShadowVerts[i] = (shadowMats[i] * model * vec4(pos, 1.0)).xyz;
			}
		}
	</color>
`;

export const shadowFragSrc = `
	<color>
		const int layers = <layers>;
		const float bias = <bias>;
		
		uniform sampler2D depths[layers];
		
		varying vec3 vShadowVerts[layers];
		
		float getShadowOccl()
		{
			for(int i = layers - 1; i >= 0; i--) {
				if(
					all(greaterThanEqual(vShadowVerts[i], vec3(-1))) &&
					all(lessThanEqual(vShadowVerts[i], vec3(+1)))
				) {
					vec2 shadowUv  = (vShadowVerts[i].xy + vec2(1, -1)) * 0.5;
					float depthVal = texture2D(depths[i], shadowUv).r * 2.0 - 1.0;
					
					return depthVal < vShadowVerts[i].z - bias ? 1.0 : 0.0;
				}
			}
			
			return 0.0;
		}
	</color>
`;
