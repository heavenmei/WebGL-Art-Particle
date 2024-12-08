"use strict";
import WrappedGL from "../lib/wrappedgl";
import Camera from "../lib/camera";
import Utilities from "../lib/utilities";
import Stats from "stats.js";

import Object from "./object";
import Box from "./box";
import Instance from "./instance";

const FOV = Math.PI / 3;
export default class Test {
  constructor(gui) {
    var canvas = (this.canvas = document.getElementById("canvas"));
    var wgl = (this.wgl = new WrappedGL(canvas));
    wgl ? console.log("=== WebGL init", wgl) : alert("WebGL not supported");
    window.wgl = wgl;
    this.gui = gui;

    this.wgl.getExtension("EXT_frag_depth");
    this.wgl.getExtension("OES_texture_float");
    this.wgl.getExtension("OES_texture_float_linear");
    this.wgl.getExtension("ANGLE_instanced_arrays");
    const stats = new Stats();
    this.stats = stats;
    document.body.appendChild(stats.domElement);

    this.camera = new Camera(this.canvas, [15, 10, 0], 40.0, 0, 0);
    this.projectionMatrix = Utilities.makePerspectiveMatrix(
      new Float32Array(16),
      FOV,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0
    );

    this.init();
    this.initGUI();
    this.render();

    /** init */
    canvas.addEventListener("wheel", this.onWheel.bind(this));
    canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
    this.onResize();
  }

  init() {
    this.object = new Object(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera
    );

    this.box = new Box(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera
    );

    this.instance = new Instance(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera,
      this.gui
    );
  }

  initGUI() {
    const gui = this.gui;
    const renderingFolder = gui.addFolder("Rendering");
    renderingFolder.add(this.instance, "fbo").name("FBO");

    renderingFolder.open();
  }

  render(time) {
    this.stats.begin();
    time *= 0.0005;

    wgl.clear(
      wgl.createClearState().bindFramebuffer(null).clearColor(0.0, 0, 0, 0.1),
      wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    );

    // this.object.render(time);
    this.instance.render(time);
    this.box.render();

    requestAnimationFrame(this.render.bind(this));
    this.stats.end();
  }

  onResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    Utilities.makePerspectiveMatrix(
      this.projectionMatrix,
      FOV,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0
    );
  }

  onWheel(event) {
    event.preventDefault();
    this.camera.onWheel(event);
  }

  onMouseMove(event) {
    var position = Utilities.getMousePosition(event, this.canvas);
    var normalizedX = position.x / this.canvas.width;
    var normalizedY = position.y / this.canvas.height;

    this.mouseX = normalizedX * 2.0 - 1.0;
    this.mouseY = (1.0 - normalizedY) * 2.0 - 1.0;

    this.camera.onMouseMove(event);
  }

  onMouseDown(event) {
    this.camera.onMouseDown(event);
  }

  onMouseUp(event) {
    this.camera.onMouseUp(event);
  }
}
