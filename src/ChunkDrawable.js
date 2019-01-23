import {VERT_SIZE} from "./ChunkMesh.js";

export class ChunkDrawable
{
	constructor(display)
	{
		this.display = display;
		this.buf     = display.createBuffer(true, true);
		this.shader  = display.getShader("chunk", vertSrc, fragSrc);
		this.atlas   = display.getTexture("gfx/atlas.png");
		this.vertnum = 0;
	}
	
	update(mesh)
	{
		this.buf.setData(mesh.getData());
		this.vertnum = mesh.getVertNum();
	}
	
	draw(pos, camera, sun)
	{
		let shader = this.shader;
		let buf    = this.buf;
		let gl     = this.display.gl;
		
		if(this.vertnum) {
			shader.use();
			
			shader.uniformVec("sun",    sun);
			shader.uniformMat("matrix", camera.getMatrix(pos));
			shader.uniformTex("atlas",  this.atlas, 0);
			
			shader.attrib("vert",      buf, 3, VERT_SIZE, 0);
			shader.attrib("occlusion", buf, 1, VERT_SIZE, 3);
			shader.attrib("normal",    buf, 3, VERT_SIZE, 4);
			shader.attrib("tile",      buf, 1, VERT_SIZE, 7);
			
			this.display.draw(this.vertnum);
		}
	}
}

const vertSrc = `
	uniform vec3 sun;
	uniform mat4 matrix;
	
	attribute vec3 vert;
	attribute vec3 normal;
	attribute float tile;
	attribute float occlusion;
	
	varying vec2 uvOffset;
	varying vec2 planePos;
	varying float coef;
	
	void main()
	{
		vec3 correctVert = vert;
		vec3 correctNormal = normal - vec3(128.0);
		
		gl_Position = matrix * vec4(correctVert, 1.0);
		
		uvOffset = vec2(mod(tile, 16.0), floor(tile / 16.0));
		planePos = vec2(0.0);
		
		coef = (
			0.5 * (1.0 - occlusion * 0.25) +
			0.5 * max(0.0, dot(correctNormal, -sun))
		);
		
		if(correctNormal.x > 0.0) {
			planePos = vec2( 0.0 - correctVert.z, 16.0 - correctVert.y);
		}
		else if(correctNormal.x < 0.0) {
			planePos = vec2(16.0 - correctVert.z, 16.0 - correctVert.y);
		}
		else if(correctNormal.y > 0.0) {
			planePos = vec2( 0.0 - correctVert.x, 16.0 - correctVert.z);
		}
		else if(correctNormal.y < 0.0) {
			planePos = vec2( 0.0 - correctVert.x,  0.0 - correctVert.z);
		}
		else if(correctNormal.z > 0.0) {
			planePos = vec2(16.0 - correctVert.x, 16.0 - correctVert.y);
		}
		else if(correctNormal.z < 0.0) {
			planePos = vec2( 0.0 - correctVert.x, 16.0 - correctVert.y);
		}
	}
`;

const fragSrc = `
	precision highp float;
	
	uniform sampler2D atlas;
	
	varying vec2 uvOffset;
	varying vec2 planePos;
	varying float coef;
	
	void main()
	{
		vec2 uv = (uvOffset + fract(planePos)) / 16.0;
		
		gl_FragColor      = texture2D(atlas, uv);
		gl_FragColor.rgb *= coef;
	}
`;
