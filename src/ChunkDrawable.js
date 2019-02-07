import {vertLayout} from "./ChunkMesh.js";

export class ChunkDrawable
{
	constructor(display)
	{
		this.display = display;
		this.buf     = display.Buffer("dynamic", vertLayout);
		this.shader  = display.getShader("chunk", vertSrc, fragSrc);
		this.atlas   = display.getTexture("gfx/atlas.png");
		this.vertnum = 0;
	}
	
	update(mesh)
	{
		this.buf.update(mesh.getData());
		this.vertnum = mesh.getVertNum();
	}
	
	draw(pos, camera, sun)
	{
		let shader = this.shader;
		let buf    = this.buf;
		let gl     = this.display.gl;
		
		if(this.vertnum) {
			shader.use();
			shader.uniform("sun",    sun);
			shader.uniform("campos", camera.pos);
			//shader.uniform("matrix", camera.getMatrix(pos));
			shader.uniform("proj", camera.getProjection());
			shader.uniform("viewModel", camera.getViewModel(pos));
			shader.texture("atlas",  this.atlas);
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
		vec3 correctNormal = normal - vec3(128.0);
		vec4 translatedVert = viewModel * vec4(correctVert, 1.0);
		
		gl_Position = proj * translatedVert;
		
		uvOffset = vec2(mod(tile, 16.0), floor(tile / 16.0));
		planePos = vec2(0.0);
		
		vTranslatedVert = translatedVert.xyz;
		
		coef = (
			0.5 * (1.0 - occl * 0.25) +
			0.5 * max(0.0, dot(correctNormal, -sun))
		);
		
		if(correctNormal.x > 0.0) {
			planePos = vec2( 0.0 + correctVert.z, 16.0 - correctVert.y);
		}
		else if(correctNormal.x < 0.0) {
			planePos = vec2(16.0 - correctVert.z, 16.0 - correctVert.y);
		}
		else if(correctNormal.y > 0.0) {
			planePos = vec2( 0.0 + correctVert.x, 16.0 - correctVert.z);
		}
		else if(correctNormal.y < 0.0) {
			planePos = vec2( 0.0 + correctVert.x,  0.0 + correctVert.z);
		}
		else if(correctNormal.z > 0.0) {
			planePos = vec2(16.0 - correctVert.x, 16.0 - correctVert.y);
		}
		else if(correctNormal.z < 0.0) {
			planePos = vec2( 0.0 + correctVert.x, 16.0 - correctVert.y);
		}
	}
`;

const fragSrc = `
	uniform sampler2D atlas;
	
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
		gl_FragColor.rgb += (1.0 - fog) * vec3(0.75, 0.875, 1.0);
	}
`;
