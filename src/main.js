import {Display} from "../gluck/Display.js";
import {Input} from "../gluck/Input.js";
import {BodyCamera} from "./BodyCamera.js";
import {Body} from "./Body.js";
import {Controller} from "./Controller.js";
import {World} from "./World.js";
import {Skybox} from "./Skybox.js";
import {Model} from "./Model.js";
import {Ground} from "./Ground.js";
import {tree1} from "../models/tree1.js";

let gravity   = 20;
let runspeed  = 8;
let jumpspeed = 7.5;

document.body.style.overflow = "hidden";

window.display    = new Display();
window.input      = new Input(display);
window.camera     = new BodyCamera();
window.world      = new World(display);
window.skybox     = new Skybox(display);
window.body       = new Body(world, 1.5, [-0.25, 0, -0.25], [0.25, 1.75, 0.25]);
window.controller = new Controller(body, input);
window.model      = new Model(display, tree1.data, tree1.indices, "gfx/tree1.png");
window.ground     = new Ground(display);

//window.colortex = display.DataTexture(2048, 2048, false);
//window.depthtex = display.DataTexture(2048, 2048, true);
//model.tex = depthtex;

display.setTopLeftAligned();
display.resizeToPage();
display.appendToBody();

camera.setAspect(display.getAspect());

body.setPos([0, 2, 0]);
body.setAcc([0, -gravity, 0]);


display.on("frame", e => {	
	controller.update(runspeed, jumpspeed, e.delta);
	body.update(e.delta);
	camera.setFromBody(body);
	world.update();
	
	/*
	display.renderToTextures(colortex, depthtex);
	world.draw(camera);
	model.draw([2.5,1,2.5], camera, world.sun);
	*/
	
	display.renderToCanvas();
	skybox.draw(camera, world.sun);
	ground.draw(camera, world.sun, camera.pos);
	world.draw(camera);
	model.draw([2.5,1,2.5], camera, world.sun);
});

input.on("resize", e => {
	display.resizeToPage();
	camera.setAspect(display.getAspect());
});
