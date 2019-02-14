import {Display} from "../gluck/Display.js";
import {Input} from "../gluck/Input.js";
import {Camera} from "./Camera.js";
import {Body} from "./Body.js";
import {Controller} from "./Controller.js";
import {World} from "./World.js";
import {Skybox} from "./Skybox.js";
import {Model} from "./Model.js";
import {Ground} from "./Ground.js";
import {tree1} from "../models/tree1.js";

let gravity   = 20;
let runspeed  = 8;4;
let jumpspeed = 7.5;

document.body.style.overflow = "hidden";

window.display    = new Display();
window.input      = new Input(display);
window.camera     = new Camera();
window.world      = new World(display);
window.skybox     = new Skybox(display);
window.body       = new Body(world, 1.5, [-0.25, 0, -0.25], [0.25, 1.75, 0.25]);
window.controller = new Controller(body, input);
window.model      = new Model(display, tree1.data, tree1.indices, "gfx/tree1.png");
window.ground     = new Ground(display);

display.setTopLeftAligned();
display.resizeToPage();
display.appendToBody();

camera.setAspect(display.getAspect());

body.setPos([0, 2, 0]);
//body.setPos([14,2,30]);
body.setAcc([0, -gravity, 0]);

/*
world.setBlock(8, 1, 2, 3, 0b1100);
world.setBlock(9, 1, 2, 3, 0b1100);
world.setBlock(9, 2, 3, 3, 0b1100);

world.setBlock(5, 1, 4, 3, 0b1010);
world.setBlock(6, 2, 4, 3, 0b1010);

world.setBlock(29,1, 8, 3, 0b0101);
world.setBlock(28,2, 8, 3, 0b0101);

world.setBlock(20,1,30, 3, 0b0011);
world.setBlock(20,2,29, 3, 0b0011);
world.setBlock(20,3,28, 3, 0b0011);
world.setBlock(20,4,27, 3, 0b0011);
world.setBlock(20,5,26, 3, 0b0011);
world.setBlock(20,6,25, 3, 0b0011);
world.setBlock(20,7,24, 3, 0b0011);
world.setBlock(20,8,23, 3, 0b0011);
world.setBlock(20,9,22, 3, 0b0011);

world.setBlock(21,1,30, 3, 0b0001);
world.setBlock(15,2,29, 3, 0b0010);
world.setBlock(25,1, 3, 3, 0b0100);
world.setBlock(5, 2, 7, 3, 0b1110);

/*world.setBlock(8, 1, 1, 3, 0b0011);
world.setBlock(9, 1, 1, 3, 0b1010);
world.setBlock(10,1, 1, 3, 0b0101);
world.setBlock(7, 1, 2, 3, 0b1000);
world.setBlock(10,1, 2, 3, 0b0100);
world.setBlock(7, 1, 3, 3, 0b1110);
*/

display.on("frame", e => {	
	controller.update(runspeed, jumpspeed, e.delta);
	body.update(e.delta);
	camera.setFromBody(body);
	world.update();
	
	skybox.draw(camera, world.sun);
	ground.draw(camera, world.sun, camera.pos);
	world.draw(camera);
	model.draw([2.5,1,2.5], camera, world.sun);
});

input.on("resize", e => {
	display.resizeToPage();
	camera.setAspect(display.getAspect());
});
