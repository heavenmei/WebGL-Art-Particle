import vertBoxwireframe from "./shaders/boxwireframe.vert";
import fragBoxwireframe from "./shaders/boxwireframe.frag";
import vertBox from "./shaders/box.vert";
import fragBox from "./shaders/box.frag";

export const BORDER = 1;
export const BOX_X = 30,
  BOX_Y = 30,
  BOX_Z = 5;

const BOX_BORDER = [
  // behind
  {
    min: [-BORDER, -BORDER, -BORDER],
    max: [BOX_X + BORDER, BOX_Y + BORDER, 0],
  },
  { min: [-BORDER, -BORDER, 0], max: [0, BOX_Y, BOX_Z] }, // left
  { min: [BOX_X, -BORDER, 0], max: [BOX_X + BORDER, BOX_Y, BOX_Z] }, //right
  {
    min: [-BORDER, BOX_Y, 0],
    max: [BOX_X + BORDER, BOX_Y + BORDER, BOX_Z],
  }, //top
  { min: [0, -BORDER, 0], max: [BOX_X, 0, BOX_Z] }, //bottom
];

class Box {
  constructor(canvas, wgl, projectionMatrix, camera) {
    this.canvas = canvas;
    this.wgl = wgl;
    this.projectionMatrix = projectionMatrix;
    this.camera = camera;

    this.boxes = BOX_BORDER;

    // * init buffers
    this.renderingRenderbuffer = wgl.createRenderbuffer();
    this.renderingFramebuffer = wgl.createFramebuffer();

    this.boxTexture = wgl.createTexture();

    this.quadVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.quadVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
      wgl.STATIC_DRAW
    );

    this.initBoxBuffers();
    this.initBoxBorderBuffers();

    this.loadPrograms();
  }

  loadPrograms() {
    const programs = this.wgl.createProgramsFromSource({
      boxWireframeProgram: {
        vertexShader: vertBoxwireframe,
        fragmentShader: fragBoxwireframe,
      },
      boxProgram: {
        vertexShader: vertBox,
        fragmentShader: fragBox,
      },
    });

    for (let programName in programs) {
      this[programName] = programs[programName];
    }
  }

  initBoxBuffers() {
    let wgl = this.wgl;

    this.cubeVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([
        // Front face
        0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0,

        // Back face
        0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,

        // Top face
        0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0,

        // Bottom face
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0,

        // Right face
        1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,

        // Left face
        0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0,
      ]),
      wgl.STATIC_DRAW
    );

    this.cubeIndexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeIndexBuffer,
      wgl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([
        0,
        1,
        2,
        0,
        2,
        3, // front
        4,
        5,
        6,
        4,
        6,
        7, // back
        8,
        9,
        10,
        8,
        10,
        11, // top
        12,
        13,
        14,
        12,
        14,
        15, // bottom
        16,
        17,
        18,
        16,
        18,
        19, // right
        20,
        21,
        22,
        20,
        22,
        23, // left
      ]),
      wgl.STATIC_DRAW
    );
  }
  initBoxBorderBuffers() {
    var wgl = this.wgl;

    this.cubeWireframeVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeWireframeVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0,

        0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0,
      ]),
      wgl.STATIC_DRAW
    );

    this.cubeWireframeIndexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeWireframeIndexBuffer,
      wgl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([
        0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
      ]),
      wgl.STATIC_DRAW
    );
  }

  onResize() {
    wgl.renderbufferStorage(
      this.renderingRenderbuffer,
      wgl.RENDERBUFFER,
      wgl.DEPTH_COMPONENT16,
      this.canvas.width,
      this.canvas.height
    );
    wgl.framebufferRenderbuffer(
      this.renderingFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.DEPTH_ATTACHMENT,
      wgl.RENDERBUFFER,
      this.renderingRenderbuffer
    );

    wgl.rebuildTexture(
      this.boxTexture,
      wgl.RGBA,
      wgl.UNSIGNED_BYTE,
      this.canvas.width,
      this.canvas.height,
      null,
      wgl.CLAMP_TO_EDGE,
      wgl.CLAMP_TO_EDGE,
      wgl.LINEAR,
      wgl.LINEAR
    );

    wgl.framebufferTexture2D(
      this.renderingFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.COLOR_ATTACHMENT0,
      wgl.TEXTURE_2D,
      this.boxTexture,
      0
    );
  }

  drawBoxes() {
    let wgl = this.wgl;

    var boxDrawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)

      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)

      .useProgram(this.boxProgram)

      .vertexAttribPointer(
        this.cubeVertexBuffer,
        this.boxProgram.getAttribLocation("a_cubeVertexPosition"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )

      .bindIndexBuffer(this.cubeIndexBuffer)

      .uniformMatrix4fv("u_projectionMatrix", false, this.projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, this.camera.getViewMatrix())

      .enable(wgl.POLYGON_OFFSET_FILL)
      .polygonOffset(1, 1);

    for (let i = 0; i < this.boxes.length; ++i) {
      let box = this.boxes[i];

      boxDrawState
        .uniform3f("u_translation", box.min[0], box.min[1], box.min[2])
        .uniform3f(
          "u_scale",
          box.max[0] - box.min[0],
          box.max[1] - box.min[1],
          box.max[2] - box.min[2]
        );

      boxDrawState.uniform3f("u_highlightSide", 1.5, 1.5, 1.5);

      wgl.drawElements(boxDrawState, wgl.TRIANGLES, 36, wgl.UNSIGNED_SHORT);
    }
  }

  drawBoxesBorder() {
    var boxWireframeDrawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)

      .enable(wgl.DEPTH_TEST)

      .useProgram(this.boxWireframeProgram)

      .vertexAttribPointer(
        this.cubeWireframeVertexBuffer,
        this.boxWireframeProgram.getAttribLocation("a_cubeVertexPosition"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )

      .bindIndexBuffer(this.cubeWireframeIndexBuffer)

      .uniformMatrix4fv("u_projectionMatrix", false, this.projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, this.camera.getViewMatrix());

    for (var i = 0; i < this.boxes.length; ++i) {
      var box = this.boxes[i];

      boxWireframeDrawState
        .uniform3f("u_translation", box.min[0], box.min[1], box.min[2])
        .uniform3f(
          "u_scale",
          box.max[0] - box.min[0],
          box.max[1] - box.min[1],
          box.max[2] - box.min[2]
        );

      wgl.drawElements(
        boxWireframeDrawState,
        wgl.LINES,
        24,
        wgl.UNSIGNED_SHORT
      );
    }
  }

  render() {
    this.drawBoxes();
    this.drawBoxesBorder();
  }
}

export default Box;
