import {Display} from "../gluck/Display.js";
import {Input} from "../gluck/Input.js";
import {BodyCamera} from "./BodyCamera.js";
import {Body} from "./Body.js";
import {Controller} from "./Controller.js";
import {World} from "./World.js";
import {Model} from "./Model.js";
import {tree1} from "../models/tree1.js";
import {generateWorld} from "./generator.js";

let gravity   = 20;
let runspeed  = 8;
let jumpspeed = 7.5;

document.body.style.overflow = "hidden";

window.display    = new Display();
window.input      = new Input(display);
window.world      = generateWorld(display);
window.body       = new Body(world, 1.5, [-0.25, 0, -0.25], [0.25, 1.75, 0.25]);
window.camera     = new BodyCamera(body);
window.controller = new Controller(body, input);
window.model      = new Model(display, tree1.data, tree1.indices, "gfx/tree1.png");

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
	camera.update();
	world.update(e.delta);
	
	/*
	display.renderToTextures(colortex, depthtex);
	world.draw(camera);
	model.draw([2.5,1,2.5], camera, world.sun);
	*/
	
	display.renderToCanvas();
	world.draw(camera);
	model.draw([2.5,1,2.5], camera, world.sun.getSkyDir());
});

input.on("resize", e => {
	display.resizeToPage();
	camera.setAspect(display.getAspect());
});
