import {Display} from "./Display.js";
import {World} from "./World.js";
import {Camera} from "./Camera.js";
import {Input} from "./Input.js";

window.display = new Display();
window.world   = new World(display);
window.input   = new Input(display);
window.camera  = new Camera();

display.resize(512, 512);
display.setCentered();
display.appendToBody();
