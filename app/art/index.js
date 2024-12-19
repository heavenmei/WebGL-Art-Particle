"use strict";
import WrappedGL from "../lib/wrappedgl.js";
import Camera from "../lib/camera.js";
import Utilities, { normalize } from "../lib/utilities.js";

import Renderer from "./renderer.js";
import Simulator from "./simulator.js";
import Box, { BOX_X, BOX_Y, BOX_Z } from "./box.js";
import Stats from "stats.js";

import vertFullscreen from "./shaders/fullscreen.vert";
import fragFullscreen from "./shaders/fullscreen.frag";

const FOV = Math.PI / 3;
const PARTICLES_PER_CELL = 10;

const SIMULATOR_BOX = [BOX_X, 1, BOX_Z];

class Fluid {
  settings = {
    showBox: true,

    sphereRadius: 1.0,
    particleCount: 10000,
    desiredParticleCount: 10000,
    gridCellDensity: 6,

    timeStep: 0,
  };

  //mouse position is in [-1, 1]
  mouseX = 0;
  mouseY = 0;
  //the mouse plane is a plane centered at the camera orbit point and orthogonal to the view direction
  lastMousePlaneX = 0;
  lastMousePlaneY = 0;

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
    this.camera = new Camera(this.canvas, [0, 0, 0]);

    // * add lights x = 0.5 光线是从右往左照，y = 0.7 光线从上方往下照， z = 1 说明光线从在场景前方。
    this.directionLight = normalize([0.5, 0.7, 1]);

    this.box = new Box(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera,
      this.directionLight
    );

    this.simulator = new Simulator(this.wgl, this.image);

    this.gridDimensions = [BOX_X, BOX_Y, BOX_Z];
    this.renderer = new Renderer(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera,
      this.gridDimensions,
      this.simulator,
      this.image
    );

    this.quadVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.quadVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
      wgl.STATIC_DRAW
    );

    this.loadPrograms();
    this.initGui();

    /** init */
    canvas.addEventListener("wheel", this.onWheel.bind(this));
    canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
    this.onResize();

    this.reset();
    this.update();
  }

  loadPrograms() {
    const programs = this.wgl.createProgramsFromSource({
      fullscreenTextureProgram: {
        vertexShader: vertFullscreen,
        fragmentShader: fragFullscreen,
        attributeLocations: { a_position: 0 },
      },
    });

    for (let programName in programs) {
      this[programName] = programs[programName];
    }
  }

  initGui() {
    const stats = new Stats();
    this.stats = stats;
    document.body.appendChild(stats.domElement);

    const settings = this.settings;
    const gui = this.gui;
    gui.add(this, "reset").name("Reset");
    gui
      .add(
        {
          play: () => {
            this.settings.timeStep = this.settings.timeStep ? 0 : 1 / 60.0;
          },
        },
        "play"
      )
      .name("Play/Pause");
    gui.add(settings, "showBox").name("Box");

    const simulationFolder = gui.addFolder("Simulation");
    simulationFolder.open();
    simulationFolder
      .add(settings, "timeStep", 0.0, 0.4, 0.01)
      .name("Time Step")
      .listen();
    simulationFolder
      .add(settings, "desiredParticleCount", 0, 200000, 1000)
      .name("Desired Count")
      .onChange((value) => {
        this.settings.desiredParticleCount = value;
        this.reset();
      });
    simulationFolder.add(settings, "particleCount").name("Count").listen();
    simulationFolder
      .add(settings, "sphereRadius", 0, 10, 1)
      .name("Sphere Radius")
      .onChange((value) => {
        this.settings.sphereRadius = value;
        this.reset();
      });
    simulationFolder
      .add(settings, "gridCellDensity", 0.0, 1.0, 0.1)
      .name("density")
      .listen();

    const renderingFolder = gui.addFolder("Rendering");
    renderingFolder.open();
  }

  reset() {
    var gridCells = BOX_X * BOX_Y * BOX_Z * this.settings.gridCellDensity;

    //assuming x:y:z ratio of 2:1:1
    var gridResolutionY = Math.ceil(Math.pow(gridCells, 1.0 / 3.0));
    var gridResolutionZ = gridResolutionY * 1;
    var gridResolutionX = gridResolutionY * 2;

    var totalGridCells = gridResolutionX * gridResolutionY * gridResolutionZ;

    const totalVolume = SIMULATOR_BOX[0] * SIMULATOR_BOX[1] * SIMULATOR_BOX[2];

    var fractionFilled = totalVolume / (BOX_X * BOX_Y * BOX_Z);

    var desiredParticleCount =
      fractionFilled * totalGridCells * PARTICLES_PER_CELL; //theoretical number of particles
    this.settings.count = desiredParticleCount;

    var particlesWidth = 512; //we fix particlesWidth
    var particlesHeight = Math.ceil(this.settings.count / particlesWidth); //then we calculate the particlesHeight that produces the closest particle count

    const particleCount = particlesWidth * particlesHeight;
    var particlePositions = [];
    for (var j = 0; j < particleCount; ++j) {
      const position = [
        Math.random() * SIMULATOR_BOX[0] - BOX_X / 2,
        Math.random() * SIMULATOR_BOX[1] - BOX_Y / 2,
        Math.random() * SIMULATOR_BOX[2] - BOX_Z / 2,
      ];
      particlePositions.push(position);
    }

    // * generate initial particle positions amd create particle position texture for them
    // const particlePositionsData = new Float32Array(particleCount * 4);
    // for (let i = 0; i < particleCount; ++i) {
    //   particlePositionsData[i * 4] =
    //     Math.random() * SIMULATOR_BOX[0] - BOX_X / 2;
    //   particlePositionsData[i * 4 + 1] =
    //     Math.random() * SIMULATOR_BOX[1] - BOX_Y / 2;
    //   particlePositionsData[i * 4 + 2] =
    //     Math.random() * SIMULATOR_BOX[2] - BOX_Z / 2;

    //   particlePositionsData[i * 4 + 3] = 0.0;
    //   particlePositions.push([
    //     Math.random() * SIMULATOR_BOX[0] - BOX_X / 2,
    //     Math.random() * SIMULATOR_BOX[1] - BOX_Y / 2,
    //     Math.random() * SIMULATOR_BOX[2] - BOX_Z / 2,
    //   ]);
    // }

    var gridCells = BOX_X * BOX_Y * BOX_Z * this.settings.gridCellDensity;

    //assuming x:y:z ratio of 2:1:1
    var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
    var gridResolutionZ = gridResolutionY * 1;
    var gridResolutionX = gridResolutionY * 2;

    var gridSize = [BOX_X, BOX_Y, BOX_Z];
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
  }

  drawTmpTexture(texture) {
    let wgl = this.wgl;
    wgl.clear(
      wgl.createClearState().bindFramebuffer(null).clearColor(0, 0, 0, 0),
      wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    );
    var drawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)
      .useProgram(this.fullscreenTextureProgram)
      .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, false, 0, 0)
      .uniformTexture("u_input", 0, wgl.TEXTURE_2D, texture);
    wgl.drawArrays(drawState, wgl.TRIANGLE_STRIP, 0, 4);
  }

  update(currentTime) {
    this.stats.begin();
    let deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
    this.lastTime = currentTime;

    var fov = 2.0 * Math.atan(1.0 / this.projectionMatrix[5]);

    var viewSpaceMouseRay = [
      this.mouseX *
        Math.tan(fov / 2.0) *
        (this.canvas.width / this.canvas.height),
      this.mouseY * Math.tan(fov / 2.0),
      -1.0,
    ];

    var mousePlaneX = viewSpaceMouseRay[0] * this.camera.distance;
    var mousePlaneY = viewSpaceMouseRay[1] * this.camera.distance;

    var mouseVelocityX = mousePlaneX - this.lastMousePlaneX;
    var mouseVelocityY = mousePlaneY - this.lastMousePlaneY;

    if (this.camera.isMouseDown()) {
      mouseVelocityX = 0.0;
      mouseVelocityY = 0.0;
    }

    this.lastMousePlaneX = mousePlaneX;
    this.lastMousePlaneY = mousePlaneY;

    var inverseViewMatrix = Utilities.invertMatrix(
      [],
      this.camera.getViewMatrix()
    );
    var worldSpaceMouseRay = Utilities.transformDirectionByMatrix(
      [],
      viewSpaceMouseRay,
      inverseViewMatrix
    );
    Utilities.normalizeVector(worldSpaceMouseRay, worldSpaceMouseRay);

    var cameraViewMatrix = this.camera.getViewMatrix();
    var cameraRight = [
      cameraViewMatrix[0],
      cameraViewMatrix[4],
      cameraViewMatrix[8],
    ];
    var cameraUp = [
      cameraViewMatrix[1],
      cameraViewMatrix[5],
      cameraViewMatrix[9],
    ];

    var mouseVelocity = [];
    for (var i = 0; i < 3; ++i) {
      mouseVelocity[i] =
        mouseVelocityX * cameraRight[i] + mouseVelocityY * cameraUp[i];
    }

    this.simulator.simulate(
      this.settings.timeStep,
      mouseVelocity,
      this.camera.getPosition(),
      worldSpaceMouseRay
    );

    this.renderer.draw();
    this.box.draw(this.renderer.renderingFramebuffer);

    this.drawTmpTexture(this.renderer.renderingTexture);

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
    this.update();
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

export default Fluid;
