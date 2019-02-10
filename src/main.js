import {Display} from "../gluck/Display.js";
import {Input} from "../gluck/Input.js";
import {Camera} from "./Camera.js";
import {Body} from "./Body.js";
import {Controller} from "./Controller.js";
import {World} from "./World.js";
import {Skybox} from "./Skybox.js";
import {Model} from "./Model.js";
import {Ground} from "./Ground.js";
import {treeMesh} from "../meshes/tree.js";

let gravity   = 20;
let runspeed  = 4;
let jumpspeed = 7.5;

document.body.style.overflow = "hidden";

window.display    = new Display();
window.input      = new Input(display);
window.camera     = new Camera();
window.world      = new World(display);
window.skybox     = new Skybox(display);
window.body       = new Body(world, 1.5, [-0.25, 0, -0.25], [0.25, 1.75, 0.25]);
window.controller = new Controller(body, input);
window.tree       = new Model(display, treeMesh.verts);
window.ground     = new Ground(display);

display.setTopLeftAligned();
display.resizeToPage();
display.appendToBody();

camera.setAspect(display.getAspect());

body.setPos([8,  16, 8]);
body.setAcc([0, -gravity, 0]);

display.on("frame", e => {	
	controller.update(runspeed, jumpspeed, e.delta);
	body.update(e.delta);
	camera.setFromBody(body);
	skybox.draw(camera, world.sun);
	ground.draw(camera, world.sun, camera.pos);
	world.update();
	tree.draw([2.5,1,2.5], camera, world.sun);
	world.draw(camera);
});

input.on("resize", e => {
	display.resizeToPage();
	camera.setAspect(display.getAspect());
});
