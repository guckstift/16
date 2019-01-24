import {Display} from "./Display.js";
import {World} from "./World.js";
import {Camera} from "./Camera.js";
import {Input} from "./Input.js";
import {Body} from "./Body.js";
import {Controller} from "./Controller.js";

document.body.style.overflow = "hidden";

window.display    = new Display();
window.world      = new World(display);
window.input      = new Input(display);
window.camera     = new Camera();
window.body       = new Body();
window.controller = new Controller(body, input);

display.resizeToPage();
display.appendToBody();

body.setPos([7,7, -7])

camera.setAspect(display.getAspect());
camera.setFromBody(body);

display.on("frame", () => {
	controller.update(camera, 1 / 60 * 4);
	world.update();
	world.draw(camera);
});

input.on("resize", () => {
	display.resizeToPage();
	camera.setAspect(display.getAspect());
});

input.on("move", e => {
	controller.pan(camera, e.movementX, e.movementY);
});
