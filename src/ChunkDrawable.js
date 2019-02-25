import {ChunkMesh, CHUNK_VERT_LAYOUT} from "./ChunkMesh.js";
import {shadowVertSrc, shadowFragSrc} from "./glsl.js";

export class ChunkDrawable extends ChunkMesh
{
	constructor(display)
	{
		super(display);
		
		this.display = display;
		
		if(display) {
			this.buf   = display.Buffer("dynamic", CHUNK_VERT_LAYOUT);
			this.atlas = display.getTexture("gfx/atlas.png");

			this.shader_c = display.getShader(
				"chunk_c", vertSrc, fragSrc, {color: true, layers: 3, bias: 1 / 4096}
			);
			
			this.shader_d = display.getShader(
				"chunk_d", vertSrc, fragSrc, {color: false}
			);
		}
	}
	
	update(getChunkVicinity, x, z)
	{
		super.update(getChunkVicinity, x, z, () => {
			if(this.display) {
				this.buf.update(this.getVerts());
			}
		});
	}
	
	drawDepth(pos, camera)
	{
		if(this.display && this.buf.getSize() > 0) {
			let shader = this.shader_d;
			let buf    = this.buf;
			let gl     = this.display.gl;
			
			shader.use();
			shader.uniform("proj",  camera.getProjection());
			shader.uniform("view",  camera.getView());
			shader.uniform("model", camera.getModel(pos));
			shader.buffer(buf);
			shader.triangles();
		}
	}
	
	draw(pos, camera, sun, shadows)
	{
		if(this.display && this.buf.getSize() > 0) {
			let shader = this.shader_c;
			let buf    = this.buf;
			let gl     = this.display.gl;
			
			shader.use();
			shader.uniform("sun",         sun);
			shader.uniform("proj",        camera.getProjection());
			shader.uniform("view",        camera.getView());
			shader.uniform("model",       camera.getModel(pos));
			shader.texture("atlas",       this.atlas);
			shader.uniforms("shadowMats", shadows.getMatrices());
			shader.textures("depths",     shadows.getDepthTexs());
			shader.buffer(buf);
			shader.triangles();
		}
	}
}

const vertSrc = shadowVertSrc + `
	<color>
		uniform vec3 sun;
	</color>
	
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 model;
	
	<color>
		attribute vec3 normal;
		attribute float tile;
		attribute float occl;
	</color>
	
	attribute vec3 vert;
	
	<color>
		varying vec3 vTranslatedVert;
		varying vec2 uvOffset;
		varying vec2 planePos;
		varying float coef;
	</color>
	
	void main()
	{
		vec3 correctVert = vert;
		vec4 translatedVert = view * model * vec4(correctVert, 1.0);
		
		gl_Position = proj * translatedVert;
		
		<color>
			vec3 correctNormal = normalize(normal / 64.0 - vec3(1.0));
			
			uvOffset = vec2(mod(tile, 16.0), floor(tile / 16.0));
			planePos = vec2(0.0);
			
			setShadowVerts(model, correctVert);
			
			vTranslatedVert = translatedVert.xyz;
			
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
		</color>
	}
`;

const fragSrc = shadowFragSrc + `
	<color>
		uniform sampler2D atlas;
		uniform vec3 sun;
		
		varying vec3 vTranslatedVert;
		varying vec2 uvOffset;
		varying vec2 planePos;
		varying float coef;
	</color>
	
	void main()
	{
		gl_FragColor = vec4(1);
		
		<color>
			float fog = min(1.0, 16.0 / length(vTranslatedVert));
			vec2 uv = (uvOffset + fract(planePos)) / 16.0;
			float depthOccl = getShadowOccl() * max(0.0, -sun.y);
			
			gl_FragColor      = texture2D(atlas, uv);
			
			if(gl_FragColor.a == 0.0) {
				discard;
			}
			
			gl_FragColor.rgb *= coef * (1.0 - depthOccl * 0.5);
			gl_FragColor.rgb *= fog;
			gl_FragColor.rgb += (1.0 - fog) * vec3(0.75, 0.875, 1.0) * max(0.0, -sun.y);
		</color>
	}
`;
