import {ChunkMesh, CHUNK_VERT_LAYOUT} from "./ChunkMesh.js";

export class ChunkDrawable extends ChunkMesh
{
	constructor(display)
	{
		super(display);
		
		this.display = display;
		this.buf     = display.Buffer("dynamic", CHUNK_VERT_LAYOUT);
		this.shader  = display.getShader("chunk", vertSrc, fragSrc);
		this.atlas   = display.getTexture("gfx/atlas.png");
	}
	
	update(chunkVicinity)
	{
		if(super.update(chunkVicinity)) {
			this.buf.update(this.getVerts());
			
			return true;
		}
		
		return false;
	}
	
	draw(pos, camera, sun)
	{
		if(this.buf.getSize() > 0) {
			let shader = this.shader;
			let buf    = this.buf;
			let gl     = this.display.gl;
			
			shader.use();
			shader.uniform("sun",       sun);
			shader.uniform("campos",    camera.pos);
			shader.uniform("proj",      camera.getProjection());
			shader.uniform("viewModel", camera.getViewModel(pos));
			shader.texture("atlas",     this.atlas);
			shader.buffer(buf);
			shader.triangles();
		}
	}
}

const vertSrc = `
	uniform vec3 sun;
	uniform mat4 proj;
	uniform mat4 viewModel;
	uniform vec3 campos;
	
	attribute vec3 vert;
	attribute vec3 normal;
	attribute float tile;
	attribute float occl;
	
	varying vec3 vTranslatedVert;
	varying vec2 uvOffset;
	varying vec2 planePos;
	varying float coef;
	
	void main()
	{
		vec3 correctVert = vert;
		vec3 correctNormal = normalize(normal / 64.0 - vec3(1.0));
		vec4 translatedVert = viewModel * vec4(correctVert, 1.0);
		
		gl_Position = proj * translatedVert;
		
		uvOffset = vec2(mod(tile, 16.0), floor(tile / 16.0));
		planePos = vec2(0.0);
		
		vTranslatedVert = translatedVert.xyz;
		
		coef = (
			0.5 * (1.0 - occl * 0.25) +
			0.5 * max(0.0, dot(correctNormal, -sun))
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
	uniform vec3 sun;
	
	varying vec3 vTranslatedVert;
	varying vec2 uvOffset;
	varying vec2 planePos;
	varying float coef;
	
	void main()
	{
		float fog = min(1.0, 16.0 / length(vTranslatedVert));
		
		vec2 uv = (uvOffset + fract(planePos)) / 16.0;
		
		gl_FragColor      = texture2D(atlas, uv);
		gl_FragColor.rgb *= coef;
		gl_FragColor.rgb *= fog;
		gl_FragColor.rgb += (1.0 - fog) * vec3(0.75, 0.875, 1.0) * max(0.0, -sun.y);
	}
`;
