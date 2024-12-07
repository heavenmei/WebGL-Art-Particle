"use strict";
import WrappedGL from "../lib/wrappedgl";
import Camera from "../lib/camera";
import Utilities from "../lib/utilities";

import BoxEditor, { AABB, InteractionMode } from "./boxeditor.js";
import Renderer from "./renderer.js";
import Simulator from "./simulator.js";
import Stats from "stats.js";

const FOV = Math.PI / 3;
const PARTICLES_PER_CELL = 10;

const GRID_WIDTH = 30,
  GRID_HEIGHT = 15,
  GRID_DEPTH = 20;
const PRESETS = [
  //dam break
  [new AABB([0, 12, 0], [30, 15, 20])],

  //block drop
  [new AABB([0, 0, 0], [30, 7, 20]), new AABB([12, 12, 5], [28, 15, 15])],
];

// state
const Status = {
  EDITING: 0,
  SIMULATING: 1,
};

class Fluid {
  state = Status.EDITING;
  currentPresetIndex = 0;
  //using gridCellDensity ensures a linear relationship to particle count ，simulation grid cell density per world space unit volume
  // todo
  // timeStep = 1.0 / 60.0;
  settings = {
    timeStep: 0,
    showBox: true,
    speed: 1,
    gridCellDensity: 6,
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

    this.projectionMatrix = Utilities.makePerspectiveMatrix(
      new Float32Array(16),
      FOV,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0
    );
    this.camera = new Camera(this.canvas, [
      GRID_WIDTH / 2,
      GRID_HEIGHT / 3,
      GRID_DEPTH / 2,
    ]);

    // * init Class
    this.gridDimensions = [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH];
    this.boxEditor = new BoxEditor(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera,
      this.gridDimensions
    );
    this.simulator = new Simulator(this.wgl, this.image);
    this.renderer = new Renderer(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera,
      this.gridDimensions,
      this.boxEditor,
      this.simulator,
      this.image
    );

    this.initGui();

    this.state = Status.EDITING;
    this.boxEditor.boxes.length = 0;

    var preset = PRESETS[this.currentPresetIndex];
    for (var i = 0; i < preset.length; ++i) {
      this.boxEditor.boxes.push(preset[i].clone());
    }

    /** init */
    canvas.addEventListener("wheel", this.onWheel.bind(this));
    canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));

    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));

    window.addEventListener("resize", this.onResize.bind(this));

    this.onResize();
  }

  initGui() {
    const stats = new Stats();
    this.stats = stats;
    document.body.appendChild(stats.domElement);

    const settings = this.settings;
    const gui = this.gui;
    const simulationFolder = gui.addFolder("Simulation");
    simulationFolder.add(this, "startSimulation").name("Start");
    simulationFolder.add(this, "stopSimulation").name("Stop");
    simulationFolder.add(this, "play").name("Play/Pause");

    const renderingFolder = gui.addFolder("Rendering");
    renderingFolder
      .add(settings, "timeStep", 0.0, 1.0 / 60.0, 0.0001)
      .name("speed")
      .listen();
    renderingFolder
      .add(settings, "gridCellDensity", 10, 30.0, 1.0)
      .name("density")
      .listen();
    renderingFolder
      .add(this.simulator, "flipness", 0.5, 1, 0.1)
      .name("flipness")
      .listen();
    renderingFolder.add(settings, "count").name("Particles Count").listen();
    renderingFolder.addColor(settings, "specularColor").name("Specular Color");

    simulationFolder.open();
    renderingFolder.open();
  }

  // * compute the number of particles for the current boxes and grid density
  getParticleCount() {
    var boxEditor = this.boxEditor;

    var gridCells =
      GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH * this.settings.gridCellDensity;

    //assuming x:y:z ratio of 2:1:1
    var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
    var gridResolutionZ = gridResolutionY * 1;
    var gridResolutionX = gridResolutionY * 2;

    var totalGridCells = gridResolutionX * gridResolutionY * gridResolutionZ;

    var totalVolume = 0;
    var cumulativeVolume = []; //at index i, contains the total volume up to and including box i (so index 0 has volume of first box, last index has total volume)

    for (var i = 0; i < boxEditor.boxes.length; ++i) {
      var box = boxEditor.boxes[i];
      var volume = box.computeVolume();

      totalVolume += volume;
      cumulativeVolume[i] = totalVolume;
    }

    var fractionFilled = totalVolume / (GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH);

    var desiredParticleCount =
      fractionFilled * totalGridCells * PARTICLES_PER_CELL; //theoretical number of particles

    return desiredParticleCount;
  }

  play = () => {
    this.settings.timeStep = this.settings.timeStep ? 0 : 1.0 / 60.0;
  };

  // * EDITING -> SIMULATING
  startSimulation() {
    if (this.boxEditor.boxes.length <= 0) return;
    this.state = Status.SIMULATING;
    this.settings.count = this.getParticleCount().toFixed(0);

    var particlesWidth = 512; //we fix particlesWidth
    var particlesHeight = Math.ceil(this.settings.count / particlesWidth); //then we calculate the particlesHeight that produces the closest particle count

    var particleCount = particlesWidth * particlesHeight;
    var particlePositions = [];

    var boxEditor = this.boxEditor;

    var totalVolume = 0;
    for (var i = 0; i < boxEditor.boxes.length; ++i) {
      totalVolume += boxEditor.boxes[i].computeVolume();
    }

    var particlesCreatedSoFar = 0;
    for (var i = 0; i < boxEditor.boxes.length; ++i) {
      var box = boxEditor.boxes[i];

      var particlesInBox = 0;
      if (i < boxEditor.boxes.length - 1) {
        particlesInBox = Math.floor(
          (particleCount * box.computeVolume()) / totalVolume
        );
      } else {
        //for the last box we just use up all the remaining particles
        particlesInBox = particleCount - particlesCreatedSoFar;
      }

      for (var j = 0; j < particlesInBox; ++j) {
        var position = box.randomPoint();
        particlePositions.push(position);
      }

      particlesCreatedSoFar += particlesInBox;
    }

    var gridCells =
      GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH * this.settings.gridCellDensity;

    //assuming x:y:z ratio of 2:1:1
    var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
    var gridResolutionZ = gridResolutionY * 1;
    var gridResolutionX = gridResolutionY * 2;

    var gridSize = [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH];
    var gridResolution = [gridResolutionX, gridResolutionY, gridResolutionZ];

    var sphereRadius = 7.0 / gridResolutionX;
    this.renderer.reset(
      particlesWidth,
      particlesHeight,
      particlePositions,
      gridSize,
      gridResolution,
      PARTICLES_PER_CELL,
      sphereRadius
    );

    this.camera.setBounds(0, Math.PI / 2);

    this.update();
  }

  // * SIMULATING -> EDITING
  stopSimulation() {
    this.settings.timeStep = 0;
    this.state = Status.EDITING;
    this.camera.setBounds(-Math.PI / 4, Math.PI / 4);

    this.update();
  }

  update() {
    if (this.state === Status.EDITING) {
      this.boxEditor.draw();
      cancelAnimationFrame(this.animationId);
    } else if (this.state === Status.SIMULATING) {
      // * start the update loop
      var lastTime = 0;
      var updateAnimation = function (currentTime) {
        this.stats.begin();

        var deltaTime = currentTime - lastTime || 0;
        lastTime = currentTime;
        this.renderer.update(this.settings.timeStep);
        this.animationId = requestAnimationFrame(updateAnimation);
        this.stats.end();
      }.bind(this);
      updateAnimation();
    }
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
    this.update();
  }

  onWheel(event) {
    event.preventDefault();
    this.camera.onWheel(event);

    if (this.state === Status.EDITING) {
      this.boxEditor.draw(event);
    } else if (this.state === Status.SIMULATING) {
      // this.renderer.onMouseMove(event);
    }
  }

  onMouseMove(event) {
    event.preventDefault();

    if (this.state === Status.EDITING) {
      this.boxEditor.onMouseMove(event);
      this.boxEditor.draw(event);
    } else if (this.state === Status.SIMULATING) {
      this.renderer.onMouseMove(event);
    }
  }

  onMouseDown(event) {
    event.preventDefault();

    if (this.state === Status.EDITING) {
      this.boxEditor.onMouseDown(event);
      this.boxEditor.draw(event);
    } else if (this.state === Status.SIMULATING) {
      this.renderer.onMouseDown(event);
    }
  }

  onMouseUp(event) {
    event.preventDefault();

    if (this.state === Status.EDITING) {
      this.boxEditor.onMouseUp(event);
      this.boxEditor.draw(event);
    } else if (this.state === Status.SIMULATING) {
      this.renderer.onMouseUp(event);
    }
  }

  onKeyDown(event) {
    if (this.state === Status.EDITING) {
      this.boxEditor.onKeyDown(event);
    }
  }

  onKeyUp(event) {
    if (this.state === Status.EDITING) {
      this.boxEditor.onKeyUp(event);
    }
  }
}

export default Fluid;
