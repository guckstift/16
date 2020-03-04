import webgl from "./webgl.js";
import frame from "./frame.js";
import Camera from "./camera.js";
import Axes from "./axes.js";
import Input from "./input.js";
//import Chunk from "./chunk.js";
import Map from "./map.js";
//import Generator from "./generator.js";
import Sky from "./sky.js";
import Body from "./body.js";
import Controller from "./controller.js";
import Ground from "./ground.js";
import Model from "./model.js";
import Batch from "./batch.js";
import Cascade from "./cascade.js";
import Quad from "./quad.js";


//[16, 2048], [256, 512]

let gravity = 40;
let runspeed  = 4;
let jumpspeed = 7.5;

let gl = webgl(800, 600, "fullPage", "appendToBody", "autosize", "no-alpha", "no-antialias");
let cam = new Camera();
let axes = new Axes(gl);
let input = new Input(gl.canvas);
let map = new Map(gl);
let sky = new Sky(gl);
let body = new Body(map, 1.5, [-0.25, -0.25, 0], [0.25, 0.25, 1.75]);
let ctrl = new Controller(body, input);
let ground = new Ground(gl);
let shadow = new Cascade(gl, [16, 2048], [256, 512]);
let quad = new Quad(gl);

//window. tree = new Model(gl, "./meshes/tree2.mesh");

//window. batch = new Batch(tree);

//batch.add(0,0,1);
//batch.add(10,10,1);

gl.enableAlphaBlending();

/*
map.setVoxel(16,1,2, 1 | 0b1100 << 8);
map.setVoxel(17,1,2, 1 | 0b1110 << 8);




map.setVoxel(1,1,2, 1 | 0b1100 << 8);
map.setVoxel(1,1,1, 1);

map.setVoxel(3,1,1, 1 | 0b1100 << 8);

map.setVoxel(5,1,1, 1 | 0b1100 << 8);
map.setVoxel(5,0,1, 1 | 0b0011 << 8);

map.setVoxel(7,1,1, 1 | 0b1100 << 8);
map.setVoxel(7,0,1, 1);

//
map.setVoxel(1,4,2, 1 | 0b1100 << 8);
map.setVoxel(1,4,1, 1);
map.setVoxel(2,4,2, 1 | 0b1100 << 8);
map.setVoxel(2,4,1, 1);

map.setVoxel(4,4,1, 1 | 0b1100 << 8);
map.setVoxel(5,4,1, 1 | 0b1100 << 8);

map.setVoxel(7,4,1, 1 | 0b1100 << 8);
map.setVoxel(7,3,1, 1 | 0b0011 << 8);
map.setVoxel(8,4,1, 1 | 0b1100 << 8);
map.setVoxel(8,3,1, 1 | 0b0011 << 8);

map.setVoxel(10,4,1, 1 | 0b1100 << 8);
map.setVoxel(10,3,1, 1);
map.setVoxel(11,4,1, 1 | 0b1100 << 8);
map.setVoxel(11,3,1, 1);

//
map.setVoxel(0,6,2, 1);
map.setVoxel(1,6,2, 1 | 0b1100 << 8);
map.setVoxel(1,6,1, 1);

map.setVoxel(3,6,2, 1);
map.setVoxel(3,5,2, 1 | 0b0011 << 8);
map.setVoxel(4,5,2, 1 | 0b0011 << 8);
map.setVoxel(4,6,2, 1 | 0b1100 << 8);
map.setVoxel(4,6,1, 1);

map.setVoxel(6,6,2, 1);
map.setVoxel(6,5,2, 1);
map.setVoxel(7,6,2, 1 | 0b1100 << 8);
map.setVoxel(7,6,1, 1);

map.setVoxel(9,6,2, 1);
map.setVoxel(9,5,2, 1);
map.setVoxel(9,5,1, 1);
map.setVoxel(10,6,2, 1 | 0b1100 << 8);
map.setVoxel(10,6,1, 1);

//
map.setVoxel(1,8,2, 1 | 0b1100 << 8);
map.setVoxel(1,8,1, 1);

map.setVoxel(3,8,2, 1 | 0b1100 << 8);
map.setVoxel(3,8,1, 1);
map.setVoxel(3,9,3, 1 | 0b1100 << 8);

map.setVoxel(5,8,2, 1 | 0b1100 << 8);
map.setVoxel(5,8,1, 1);
map.setVoxel(5,9,3, 1);

map.setVoxel(7,8,2, 1 | 0b1100 << 8);
map.setVoxel(7,8,1, 1);
map.setVoxel(7,8,3, 1);

//
map.setVoxel(1,11,2, 1 | 0b1100 << 8);
map.setVoxel(0,11,3, 1);
map.setVoxel(1,11,1, 1);

map.setVoxel(4,11,2, 1 | 0b1100 << 8);
map.setVoxel(3,11,2, 1 | 0b1100 << 8);
map.setVoxel(3,12,3, 1);
map.setVoxel(4,11,1, 1);
map.setVoxel(4,12,3, 1 | 0b1100 << 8);

map.setVoxel(7,11,2, 1 | 0b1100 << 8);
map.setVoxel(7,11,1, 1);
map.setVoxel(7,12,3, 1);
map.setVoxel(6,12,3, 1);

map.setVoxel(10,11,2, 1 | 0b1100 << 8);
map.setVoxel(9 ,11,2, 1 | 0b1100 << 8);
map.setVoxel(10,11,1, 1);
map.setVoxel(10,11,3, 1);
map.setVoxel(11,11,2, 1);
map.setVoxel(11,11,3, 1);
/**/

//map.generate();
//map.remesh();

/*
for(let y=0; y < 4; y++) {
	for(let x=0; x < 4; x++) {
		gen.genChunk(x, y, 0);
	}
}
*/

let d = 64;
//window. chunk = new Chunk(gl, createMesh, d,d,d);

/*
input.on(this, "down", () => {
	input.lock();
});

input.on(this, "move", e => {
	if(input.locked) {
		body.ra += -e.movey;
		body.rb += -e.movex;
	}
});
*/

body.acc[2] = -gravity;
body.ra = 90;
body.rb = -45;
body.x = 0;
body.y = 0;
body.z = 10;

/*
map.setVoxel(0,0,1, 1);
map.setVoxel(0,1,1, 1 | 0b0011 << 8);

map.setVoxel(2,0,1, 1);
map.setVoxel(3,0,1, 1 | 0b0101 << 8);

map.setVoxel(5,1,1, 1);
map.setVoxel(5,0,1, 1 | 0b1100 << 8);

map.setVoxel(8,0,1, 1);
map.setVoxel(7,0,1, 1 | 0b1010 << 8);
*/
//map.setVoxel(1,0,1, 1);
//map.setVoxel(0,1,1, 1);
//map.setVoxel(1,2,1, 1);
//map.setVoxel(2,1,1, 1);

frame(delta => {
	ctrl.update(delta);
	body.update(delta);
	sky.update(delta);
	map.update();
	shadow.update(body, sky);
	
	cam.copyFromBody(body);
	cam.aspect = gl.aspect();
	
	shadow.generate(layer => {
		map.draw(layer.camera, sky, null, false);
	});
	
	/*
	shadow1.begin();
	map.draw(shadow1.camera, sky, null, false);
	shadow1.end();
	
	shadow2.begin();
	map.draw(shadow2.camera, sky, null, false);
	shadow2.end();
	*/
		
	sky.draw(cam);
	//ground.draw(cam, sky);
	map.draw(cam, sky, shadow);
	//quad.draw(cam, shadow1.depthtex, [0,2,0]);
	//map.draw(shadow.camera, sky, shadow);
	axes.draw(cam);
});

window.map = map;
window.sky = sky;
window.cam = cam;
window.body = body;

/*
import {Display} from "../gluck/Display.js";
import {Input} from "../gluck/Input.js";
import {BodyCamera} from "./BodyCamera.js";
import {Body} from "./Body.js";
import {Controller} from "./Controller.js";
import {World} from "./World.js";
import {generateWorld, loadWorld} from "./generator.js";

let gravity   = 20;
let runspeed  = 8;
let jumpspeed = 7.5;

document.body.style.overflow = "hidden";

window.display    = new Display();
window.input      = new Input(display);
//window.world      = loadWorld(display, "world0.png", plain => { console.log("world done") });
window.world      = generateWorld(display, plain => { console.log("world done") });
window.body       = new Body(world, 1.5, [-0.25, 0, -0.25], [0.25, 1.75, 0.25]);
window.camera     = new BodyCamera(body);
window.controller = new Controller(body, input);

display.setTopLeftAligned();
display.resizeToPage();
display.appendToBody();

camera.setAspect(display.getAspect());

body.setPos([0, 2, 0]);
body.setAcc([0, -gravity, 0]);

//display.on("fps", console.log);

display.on("frame", e => {
	controller.update(runspeed, jumpspeed, e.delta);
	body.update(e.delta);
	camera.update();
	world.update(e.delta);
	
	display.renderToCanvas();
	world.draw(camera);
});

input.on("resize", e => {
	display.resizeToPage();
	camera.setAspect(display.getAspect());
});
*/
