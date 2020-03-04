import webgl from "./webgl.js";
import frame from "./frame.js";
import Camera from "./camera.js";
import Axes from "./axes.js";
import Input from "./input.js";
import Body from "./body.js";
import Controller from "./controller.js";
import World from "./world.js";
import Debugger from "./debugger.js";

let gravity = 40;
let runspeed  = 4;
let jumpspeed = 7.5;

let gl = webgl(800, 600, "fullPage", "appendToBody", "autosize", "no-alpha", "no-antialias");

let world = new World(gl, [
	[16,   512,  8],
	[64,  1024, 16],
	[256, 2048, 32],
]);

let cam = new Camera();
let axes = new Axes(gl);
let input = new Input(gl.canvas);
let body = new Body(world.map, 1.5, [-0.25, -0.25, 0], [0.25, 0.25, 1.75]);
let ctrl = new Controller(body, input);
let debug = new Debugger();

debug.start();

window.body = body;
window.debug = debug;

gl.enableAlphaBlending();

body.acc[2] = -gravity;
body.ra = 90;
body.rb = -45;
body.x = 0;
body.y = 0;
body.z = 10;

frame(delta => {
	ctrl.update(delta);
	body.update(delta);
	
	cam.copyFromBody(body);
	cam.aspect = gl.aspect();
	
	world.update(delta);
	
	world.draw(cam);
	axes.draw(cam);
});

