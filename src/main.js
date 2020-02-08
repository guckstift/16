import webgl from "./owgl/webgl.js";
import frame from "./utils/frame.js";
import Camera from "./camera.js";
import Axes from "./axes.js";
import Input from "./input.js";
import createMesh from "./voxels/mesher.js";
//import Chunk from "./chunk.js";
import Map from "./map.js";
import Generator from "./generator.js";
import Sky from "./sky.js";
import Body from "./body.js";
import Controller from "./controller.js";

let gravity = 20;
let runspeed  = 4;
let jumpspeed = 7.5;

let gl = webgl(800, 600, "fullPage", "appendToBody", "autosize", "alpha", "no-antialias");
let cam = new Camera();
let axes = new Axes(gl);
let input = new Input(gl.canvas);
let map = new Map(gl);
//let gen = new Generator(gl, 16, 16, 256, map);
let sky = new Sky(gl);
let body = new Body(map, 1.5, [-0.25, -0.25, 0], [0.25, 0.25, 1.75]);
let ctrl = new Controller(body, input);

map.generate();
map.remesh();

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
body.x = 0.5;
body.y = 2.5;
body.z = 30;

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
	cam.copyFromBody(body);
	
	sky.update(delta);
	cam.aspect = gl.aspect();
	sky.draw(cam);
	let t0 = performance.now();
	map.draw(cam, sky);
	//console.log(performance.now() - t0);
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
