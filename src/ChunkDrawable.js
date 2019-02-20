import {ChunkMesh, CHUNK_VERT_LAYOUT} from "./ChunkMesh.js";

export class ChunkDrawable extends ChunkMesh
{
	constructor(display)
	{
		super(display);
		
		this.display = display;
		
		if(display) {
			this.buf    = display.Buffer("dynamic", CHUNK_VERT_LAYOUT);
			this.shader = display.getShader("chunk", vertSrc, fragSrc);
			this.atlas  = display.getTexture("gfx/atlas.png");
		}
	}
	
	update(getChunkVicinity, x, y, z)
	{
		super.update(getChunkVicinity, x, y, z, () => {
			if(this.display) {
				this.buf.update(this.getVerts());
			}
		});
	}
	
	draw(pos, camera, sun, shadowmapTotal, shadowmapDetail)
	{
		if(this.display && this.buf.getSize() > 0) {
			let shader = this.shader;
			let buf    = this.buf;
			let gl     = this.display.gl;
			
			shader.use();
			shader.uniform("sun",       sun);
			shader.uniform("campos",    camera.pos);
			shader.uniform("proj",      camera.getProjection());
			shader.uniform("view",      camera.getView());
			shader.uniform("model",     camera.getModel(pos));
			shader.uniform("shadowMatTotal",  shadowmapTotal.getMatrix());
			shader.uniform("shadowMatDetail", shadowmapDetail.getMatrix());
			shader.texture("atlas",     this.atlas);
			shader.texture("depthTotal", shadowmapTotal.depthtex);
			shader.texture("depthDetail", shadowmapDetail.depthtex);
			shader.buffer(buf);
			shader.triangles();
		}
	}
}

const vertSrc = `
	uniform vec3 sun;
	uniform mat4 proj;
	uniform mat4 viewModel;
	uniform mat4 view;
	uniform mat4 model;
	uniform mat4 shadowMatTotal;
	uniform mat4 shadowMatDetail;
	uniform vec3 campos;
	
	attribute vec3 vert;
	attribute vec3 normal;
	attribute float tile;
	attribute float occl;
	
	varying vec3 vTranslatedVert;
	varying vec3 vShadowVertTotal;
	varying vec3 vShadowVertDetail;
	varying vec2 uvOffset;
	varying vec2 planePos;
	varying float coef;
	
	void main()
	{
		vec3 correctVert = vert;
		vec3 correctNormal = normalize(normal / 64.0 - vec3(1.0));
		vec4 translatedVert = view * model * vec4(correctVert, 1.0);
		
		vec4 shadowVertTotal  = shadowMatTotal * model * vec4(correctVert, 1.0);
		vec4 shadowVertDetail = shadowMatDetail * model * vec4(correctVert, 1.0);
		
		gl_Position = proj * translatedVert;
		
		uvOffset = vec2(mod(tile, 16.0), floor(tile / 16.0));
		planePos = vec2(0.0);
		
		vTranslatedVert   = translatedVert.xyz;
		vShadowVertTotal  = shadowVertTotal.xyz;
		vShadowVertDetail = shadowVertDetail.xyz;
		
		coef = (
			0.5 * (1.0 - occl * 0.25) +
			0.5 * max(0.0, dot(correctNormal, -sun)) * max(0.0, -sun.y)
		);
		
		if(correctNormal.y > 0.125) {
			planePos = vec2( 0.0 + correctVert.x, 16.0 - correctVert.z);
		}
		else if(correctNormal.y < -0.125) {
			planePos = vec2( 0.0 + correctVert.x,  0.0 + correctVert.z);
		}
		else if(correctNormal.x > 0.125) {
			planePos = vec2( 0.0 + correctVert.z, 16.0 - correctVert.y);
		}
		else if(correctNormal.x < -0.125) {
			planePos = vec2(16.0 - correctVert.z, 16.0 - correctVert.y);
		}
		else if(correctNormal.z > 0.125) {
			planePos = vec2(16.0 - correctVert.x, 16.0 - correctVert.y);
		}
		else if(correctNormal.z < -0.125) {
			planePos = vec2( 0.0 + correctVert.x, 16.0 - correctVert.y);
		}
	}
`;

const fragSrc = `
	uniform sampler2D atlas;
	uniform sampler2D depthTotal;
	uniform sampler2D depthDetail;
	uniform vec3 sun;
	
	varying vec3 vTranslatedVert;
	varying vec3 vShadowVertTotal;
	varying vec3 vShadowVertDetail;
	varying vec2 uvOffset;
	varying vec2 planePos;
	varying float coef;
	
	void main()
	{
		float bias = 1.0 / 4096.0;
		float fog = min(1.0, 16.0 / length(vTranslatedVert));
		vec2 uv = (uvOffset + fract(planePos)) / 16.0;
		float depthOccl = 0.0;
		
		if(
			vShadowVertDetail.x >= -1.0 && vShadowVertDetail.x <= +1.0 &&
			vShadowVertDetail.y >= -1.0 && vShadowVertDetail.y <= +1.0 &&
			vShadowVertDetail.z >= -1.0 && vShadowVertDetail.z <= +1.0
		) {
			vec2 shadowUv = (vShadowVertDetail.xy + vec2(1, -1)) * 0.5;
			float depthVal = texture2D(depthDetail, shadowUv).r * 2.0 - 1.0;
			
			depthOccl = depthVal < vShadowVertDetail.z - bias ? 1.0 : 0.0;
		}
		else {
			vec2 shadowUv = (vShadowVertTotal.xy + vec2(1, -1)) * 0.5;
			float depthVal = texture2D(depthTotal, shadowUv).r * 2.0 - 1.0;
			
			depthOccl = depthVal < vShadowVertTotal.z - bias ? 1.0 : 0.0;
		}
		
		depthOccl *= max(0.0, -sun.y);
		
		gl_FragColor      = texture2D(atlas, uv);
		gl_FragColor.rgb *= coef * (1.0 - depthOccl * 0.5);
		
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * vec3(0.75, 0.875, 1.0) * max(0.0, -sun.y);
	}
`;
