import vertBox from "./shaders/box.vert";
import fragBox from "./shaders/box.frag";

import * as THREE from "three";

export const BORDER = 1;
export const BOX_X = 30;
export const BOX_Y = 10;
export const BOX_Z = 20;

const BOX_COLOR = [0.9, 0.9, 0.9, 1.0];
const BOX = [
  // {
  //   // font
  //   translate: [0, 0, BOX_Z / 2 + BORDER],
  //   size: [BOX_X + BORDER * 3, BOX_Y + BORDER * 2, BORDER],
  // },
  {
    // behind
    translate: [0, 0, -BOX_Z / 2 - BORDER],
    size: [BOX_X + BORDER * 3, BOX_Y + BORDER * 2, BORDER],
  },
  // {
  //   // top
  //   translate: [0, BOX_Y / 2 + BORDER, 0],
  //   size: [BOX_X + BORDER * 3, BORDER, BOX_Z + BORDER * 3],
  // },
  {
    // bottom
    translate: [0, -BOX_Y / 2 - BORDER, 0],
    size: [BOX_X + BORDER * 3, BORDER, BOX_Z + BORDER * 3],
  },
  {
    // right
    translate: [BOX_X / 2 + BORDER, 0, 0],
    size: [BORDER, BOX_Y + BORDER * 2, BOX_Z + BORDER * 2],
  },
  {
    // left
    translate: [-BOX_X / 2 - BORDER, 0, 0],
    size: [BORDER, BOX_Y + BORDER * 2, BOX_Z + BORDER * 2],
  },
];

class Box {
  constructor(canvas, wgl, projectionMatrix, camera, directionLight) {
    this.canvas = canvas;
    this.wgl = wgl;
    this.projectionMatrix = projectionMatrix;
    this.camera = camera;
    this.directionLight = directionLight;

    // * init buffers
    this.boxTexture = wgl.createTexture();
    this.quadVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.quadVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
      wgl.STATIC_DRAW
    );

    this.initBoxBuffers();

    this.loadPrograms();
  }

  loadPrograms() {
    const programs = this.wgl.createProgramsFromSource({
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

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    // console.log("geometry", geometry);

    this.cubeVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(geometry.attributes.position.array),
      wgl.STATIC_DRAW
    );

    this.cubeNormalBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeNormalBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(geometry.attributes.normal.array),
      wgl.STATIC_DRAW
    );

    this.cubeIndexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeIndexBuffer,
      wgl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(geometry.index.array),
      wgl.STATIC_DRAW
    );
  }

  drawBoxes(framebuffer) {
    let wgl = this.wgl;

    var boxDrawState = wgl
      .createDrawState()
      .bindFramebuffer(framebuffer)
      .viewport(0, 0, this.canvas.width, this.canvas.height)

      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)

      .useProgram(this.boxProgram)

      .vertexAttribPointer(
        this.cubeVertexBuffer,
        this.boxProgram.getAttribLocation("a_position"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribPointer(
        this.cubeNormalBuffer,
        this.boxProgram.getAttribLocation("a_normal"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )

      .bindIndexBuffer(this.cubeIndexBuffer)

      .uniform4fv("u_color", BOX_COLOR)
      .uniform3fv("u_reverseLightDirection", this.directionLight)
      .uniformMatrix4fv("u_projectionMatrix", false, this.projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, this.camera.getViewMatrix())
      .enable(wgl.POLYGON_OFFSET_FILL)
      .polygonOffset(1, 1);

    for (let i = 0; i < BOX.length; ++i) {
      let box = BOX[i];

      boxDrawState
        .uniform3f(
          "u_translation",
          box.translate[0] + BOX_X / 2,
          box.translate[1] + BOX_Y / 2,
          box.translate[2] + BOX_Z / 2
        )
        .uniform3f("u_scale", box.size[0], box.size[1], box.size[2]);

      wgl.drawElements(boxDrawState, wgl.TRIANGLES, 36, wgl.UNSIGNED_SHORT);
    }
  }
}

export default Box;
