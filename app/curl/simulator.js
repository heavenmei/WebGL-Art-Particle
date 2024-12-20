import vertFullscreen from "./shaders/fullscreen.vert";
import fragFullscreen from "./shaders/fullscreen.frag";
import fragSimulation from "./shaders/simulation.frag";
import { BOX_X, BOX_Y, BOX_Z } from "./box";

const BASE_LIFETIME = 10;

class Simulator {
  particlesWidth = 0;
  particlesHeight = 0;
  time = 0.0;
  frameNumber = 0; //used for motion randomness

  constructor(canvas, wgl, image) {
    this.canvas = canvas;
    this.wgl = wgl;
    this.image = image;

    this.halfFloatExt = this.wgl.getExtension("OES_texture_half_float");
    this.wgl.getExtension("OES_texture_half_float_linear");
    this.simulationNumberType = this.halfFloatExt.HALF_FLOAT_OES;

    // * simulation objects (most are filled in by reset)
    this.fullscreenVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.fullscreenVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
      wgl.STATIC_DRAW
    );

    this.simulationFramebuffer = wgl.createFramebuffer();

    this.particlePositionTexture = wgl.createTexture();
    this.particlePositionTextureTemp = wgl.createTexture();
    this.particlePositionTextureDefault = wgl.createTexture();

    this.loadPrograms();
  }

  loadPrograms() {
    const programs = this.wgl.createProgramsFromSource({
      simulationProgram: {
        vertexShader: vertFullscreen,
        fragmentShader: fragSimulation,
      },
      fullscreenTextureProgram: {
        vertexShader: vertFullscreen,
        fragmentShader: fragFullscreen,
      },
    });

    for (let programName in programs) {
      this[programName] = programs[programName];
    }
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
      .vertexAttribPointer(
        this.fullscreenVertexBuffer,
        0,
        2,
        wgl.FLOAT,
        false,
        0,
        0
      )
      .uniformTexture("u_input", 0, wgl.TEXTURE_2D, texture);
    wgl.drawArrays(drawState, wgl.TRIANGLE_STRIP, 0, 4);
  }

  reset(particlesWidth, particlesHeight, particlePositions) {
    let wgl = this.wgl;

    // * similar to renderer reset
    this.particlesWidth = particlesWidth;
    this.particlesHeight = particlesHeight;

    // * generate initial particle positions amd create particle position texture for them
    var particlePositionsData = new Float32Array(
      this.particlesWidth * this.particlesHeight * 4
    );
    for (var i = 0; i < this.particlesWidth * this.particlesHeight; ++i) {
      particlePositionsData[i * 4] = particlePositions[i][0];
      particlePositionsData[i * 4 + 1] = particlePositions[i][1];
      particlePositionsData[i * 4 + 2] = particlePositions[i][2];
      particlePositionsData[i * 4 + 3] = Math.random() * BASE_LIFETIME;
    }
    // console.log("=== particlePositionsData", particlePositionsData);

    wgl.rebuildTexture(
      this.particlePositionTextureDefault,
      wgl.RGBA,
      wgl.FLOAT,
      this.particlesWidth,
      this.particlesHeight,
      particlePositionsData,
      wgl.CLAMP_TO_EDGE,
      wgl.CLAMP_TO_EDGE,
      wgl.NEAREST,
      wgl.NEAREST
    );

    wgl.rebuildTexture(
      this.particlePositionTexture,
      wgl.RGBA,
      wgl.FLOAT,
      this.particlesWidth,
      this.particlesHeight,
      particlePositionsData,
      wgl.CLAMP_TO_EDGE,
      wgl.CLAMP_TO_EDGE,
      wgl.NEAREST,
      wgl.NEAREST
    );
    wgl.rebuildTexture(
      this.particlePositionTextureTemp,
      wgl.RGBA,
      wgl.FLOAT,
      this.particlesWidth,
      this.particlesHeight,
      null,
      wgl.CLAMP_TO_EDGE,
      wgl.CLAMP_TO_EDGE,
      wgl.NEAREST,
      wgl.NEAREST
    );
  }

  /**
   * 计算模拟的位置
   * Call reset() before simulating
   * @param {number} speed
   * @param {[number,number,number]} mouseVelocity
   * @param {[number,number,number]} mouseRayOrigin
   * @param {[number,number,number]} mouseRayDirection
   * @returns
   */
  simulate(deltaTime, speed) {
    if (speed === 0.0) return;

    this.frameNumber += 1;
    this.time += deltaTime;

    if (!this.isLog) {
      console.log("=== simulate", this.particlesWidth, this.particlesHeight);
      this.isLog = true;
    }

    //render from A -> B
    wgl.framebufferTexture2D(
      this.simulationFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.COLOR_ATTACHMENT0,
      wgl.TEXTURE_2D,
      this.particlePositionTextureTemp,
      0
    );

    wgl.clear(
      wgl.createClearState().bindFramebuffer(this.simulationFramebuffer),
      wgl.COLOR_BUFFER_BIT
    );

    let simulationDrawState = wgl
      .createDrawState()
      .bindFramebuffer(this.simulationFramebuffer)
      // .viewport(0, 0, this.canvas.width, this.canvas.height)
      .viewport(0, 0, this.particlesWidth, this.particlesHeight)

      .disable(wgl.DEPTH_TEST)
      .disable(wgl.BLEND)
      .useProgram(this.simulationProgram)

      .vertexAttribPointer(
        this.fullscreenVertexBuffer,
        this.simulationProgram.getAttribLocation("a_position"),
        2,
        wgl.FLOAT,
        false,
        0,
        0
      )

      .uniformTexture(
        "u_particleTexture",
        0,
        wgl.TEXTURE_2D,
        this.particlePositionTexture
      )
      .uniformTexture(
        "u_particleDefaultTexture",
        1,
        wgl.TEXTURE_2D,
        this.particlePositionTextureDefault
      )
      .uniform3f("u_box", BOX_X, BOX_Y, BOX_Z)
      .uniform2f("u_resolution", this.particlesWidth, this.particlesHeight)
      .uniform1f("u_time", this.time)
      .uniform1f("u_speed", speed);

    wgl.drawArrays(simulationDrawState, wgl.TRIANGLE_STRIP, 0, 4);

    //swap A and B
    // swap(this, "particlePositionTexture", "particlePositionTextureTemp");
    swap(this, "particlePositionTextureTemp", "particlePositionTexture");

    // this.drawTmpTexture(this.particlePositionTexture);
    // this.drawTmpTexture(this.particlePositionTextureTemp);
  }
}

export default Simulator;

function swap(object, a, b) {
  var temp = object[a];
  object[a] = object[b];
  object[b] = temp;
}
