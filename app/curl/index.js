"use strict";
import WrappedGL from "../lib/wrappedgl";
import Camera from "../lib/camera";
import Utilities from "../lib/utilities";

import Renderer from "./renderer.js";
import Simulator from "./simulator.js";
import Box, { BOX_X, BOX_Y, BOX_Z, BORDER } from "./box.js";

import Stats from "stats.js";

const FOV = Math.PI / 3;
const PARTICLES_PER_CELL = 10;

const BOX = [
  [0, 0, 0],
  [BOX_X, BOX_Y, 2],
];

export default class Curl {
  //using gridCellDensity ensures a linear relationship to particle count ，simulation grid cell density per world space unit volume
  // todo
  lastTime = 0.0;
  settings = {
    showBox: true,
    speed: 0,
    gridCellDensity: 20,
    dieSpeed: 0.015,
    radius: 0,
    curlSize: 0,
    attraction: 0,
    count: 0,
    specularColor: "#fff",
  };
  constructor(gui, image) {
    this.image = image;
    this.gui = gui;

    var canvas = (this.canvas = document.getElementById("canvas"));
    var wgl = (this.wgl = new WrappedGL(canvas));
    wgl ? console.log("=== WebGL init", wgl) : alert("WebGL not supported");

    window.wgl = wgl;
    this.initGui();
    this.projectionMatrix = Utilities.makePerspectiveMatrix(
      new Float32Array(16),
      FOV,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0
    );
    this.camera = new Camera(
      this.canvas,
      [BOX_X / 2, BOX_Y / 2, BOX_Z / 2],
      40.0,
      0,
      0
    );

    this.gridDimensions = [BOX_X, BOX_Y, BOX_Z];

    this.quadVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.quadVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
      wgl.STATIC_DRAW
    );

    this.box = new Box(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera
    );

    this.simulator = new Simulator(this.canvas, this.wgl, this.image);

    this.renderer = new Renderer(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera,
      this.gridDimensions,
      BOX[1],
      this.simulator,
      this.image
    );

    this.start();

    /** init */
    canvas.addEventListener("wheel", this.onWheel.bind(this));
    canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
  }

  initGui() {
    const stats = new Stats();
    this.stats = stats;
    document.body.appendChild(stats.domElement);

    const settings = this.settings;
    const gui = this.gui;
    const simulationFolder = gui.addFolder("Simulation");

    const renderingFolder = gui.addFolder("Rendering");
    renderingFolder.add(settings, "showBox").name("Box");
    renderingFolder.add(settings, "speed", 0.0, 2.0, 0.1).name("speed");
    renderingFolder
      .add(settings, "gridCellDensity", 10, 30.0, 1.0)
      .name("density")
      .listen();
    renderingFolder.add(settings, "count").name("Particles Count").listen();
    renderingFolder.addColor(settings, "specularColor").name("Specular Color");

    this.settings.count = this.getParticleCount().toFixed(0);

    simulationFolder.open();
    renderingFolder.open();
  }

  // * compute the number of particles for the current boxes and grid density
  getParticleCount() {
    var gridCells = BOX_X * BOX_Y * BOX_Z * this.settings.gridCellDensity;

    //assuming x:y:z ratio of 2:1:1
    var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
    var gridResolutionZ = gridResolutionY * 1;
    var gridResolutionX = gridResolutionY * 2;

    var totalGridCells = gridResolutionX * gridResolutionY * gridResolutionZ;

    this.totalVolume = computeVolume(BOX[0], BOX[1]);

    var fractionFilled = this.totalVolume / (BOX_X * BOX_Y * BOX_Z);

    var desiredParticleCount =
      fractionFilled * totalGridCells * PARTICLES_PER_CELL; //theoretical number of particles

    return desiredParticleCount;
  }

  start() {
    this.onResize();

    // * generate initial particle positions
    var desiredParticleCount = this.getParticleCount(); //theoretical number of particles
    var particlesWidth = 512; //we fix particlesWidth
    var particlesHeight = Math.ceil(desiredParticleCount / particlesWidth); //then we calculate the particlesHeight that produces the closest particle count

    var particleCount = particlesWidth * particlesHeight;
    var particlePositions = [];

    for (var j = 0; j < particleCount; ++j) {
      var position = randomPoint(BOX[0], BOX[1]);
      particlePositions.push(position);
    }

    var gridCells = BOX_X * BOX_Y * BOX_Z * this.settings.gridCellDensity;

    //assuming x:y:z ratio of 2:1:1
    var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
    var gridResolutionZ = gridResolutionY * 1;
    var gridResolutionX = gridResolutionY * 2;

    var sphereRadius = 7.0 / gridResolutionX;

    this.simulator.reset(particlesWidth, particlesHeight, particlePositions);

    this.renderer.reset(particlesWidth, particlesHeight, sphereRadius);

    this.update();
  }

  // * start the update loop
  update(currentTime) {
    this.stats.begin();
    let deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
    this.lastTime = currentTime;

    this.simulator.simulate(
      deltaTime,
      this.settings.speed,
      this.camera.getPosition()
    );

    wgl.clear(
      wgl
        .createClearState()
        .bindFramebuffer(null)
        .clearColor(0.0, 0.0, 0.0, 0.0),
      wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    );

    this.renderer.draw();
    // this.settings.showBox && this.box.draw();

    requestAnimationFrame(this.update.bind(this));

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

    this.renderer.onResize();
    this.box.onResize();
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

function computeVolume(min, max) {
  var volume = 1;
  for (var i = 0; i < 3; ++i) {
    volume *= max[i] - min[i];
  }
  return volume;
}

function randomPoint(min, max) {
  //random point in this AABB
  var point = [];
  for (var i = 0; i < 3; ++i) {
    point[i] = min[i] + Math.random() * (max[i] - min[i]);
  }
  return point;
}
