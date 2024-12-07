"use strict";
import WrappedGL from "../lib/wrappedgl";
import Camera from "../lib/camera";
import { primitives } from "twgl.js";
import Utilities, {
  makeRandomVertexColors,
  getCubePositions,
} from "../lib/utilities";

import Box from "./box";

import vertObject from "./shaders/object.vert";
import fragObject from "./shaders/object.frag";
import vert2D from "./shaders/2d.vert";
import frag2D from "./shaders/2d.frag";
import vertInstance from "./shaders/instance.vert";
import fragInstance from "./shaders/instance.frag";

const FOV = Math.PI / 3;
const SPHERE_RADIUS = 5;
const SPHERE_STEPS = 8;
const SPHERE_LINES = 6;
const CUBE_SIZE = 5;
const INSTANCE_COUNT = 10;

export default class Test {
  constructor() {
    var canvas = (this.canvas = document.getElementById("canvas"));
    var wgl = (this.wgl = new WrappedGL(canvas));
    wgl ? console.log("=== WebGL init", wgl) : alert("WebGL not supported");
    window.wgl = wgl;

    this.wgl.getExtension("EXT_frag_depth");
    this.wgl.getExtension("OES_texture_float");
    this.wgl.getExtension("OES_texture_float_linear");
    this.wgl.getExtension("ANGLE_instanced_arrays");

    this.camera = new Camera(this.canvas, [15, 10, 0], 40.0, 0, 0);
    this.projectionMatrix = Utilities.makePerspectiveMatrix(
      new Float32Array(16),
      FOV,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0
    );

    this.box = new Box(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera
    );

    this.loadPrograms();

    this.initObject();

    this.onResize();
    this.render();

    /** init */
    canvas.addEventListener("wheel", this.onWheel.bind(this));
    canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
  }

  loadPrograms() {
    const programs = this.wgl.createProgramsFromSource({
      objectProgram: {
        vertexShader: vertObject,
        fragmentShader: fragObject,
      },
      twoDProgram: {
        vertexShader: vert2D,
        fragmentShader: frag2D,
      },
      instanceProgram: {
        vertexShader: vertInstance,
        fragmentShader: fragInstance,
      },
    });

    for (let programName in programs) {
      this[programName] = programs[programName];
    }
  }

  initObject() {
    // * Sphere Position
    let sphereVertices = primitives.createSphereVertices(
      SPHERE_RADIUS,
      SPHERE_STEPS,
      SPHERE_LINES
    );
    sphereVertices = primitives.deindexVertices(sphereVertices);
    this.sphereNumElements =
      sphereVertices.position.length / sphereVertices.position.numComponents;

    this.spherePositionBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.spherePositionBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(sphereVertices.position),
      wgl.STATIC_DRAW
    );

    const sphereColors = makeRandomVertexColors(this.sphereNumElements);
    this.sphereColorBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.sphereColorBuffer,
      wgl.ARRAY_BUFFER,
      new Uint8Array(sphereColors),
      wgl.STATIC_DRAW
    );

    // * Cube Index
    const cubeVertices = getCubePositions(CUBE_SIZE);
    this.cubeVertices = cubeVertices;

    this.cubeVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(cubeVertices.vertices),
      wgl.STATIC_DRAW
    );

    this.cubeIndexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubeIndexBuffer,
      wgl.ELEMENT_ARRAY_BUFFER,
      new Uint8Array(cubeVertices.indices),
      wgl.STATIC_DRAW
    );

    // * Instance Offset
    var offsetArray = [];
    for (var i = 0; i < INSTANCE_COUNT; i++) {
      var x = i * 5;
      var y = i * 1;
      var z = i * 0.5;
      offsetArray.push(x, y, z);
    }

    this.instanceOffsetBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.instanceOffsetBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(offsetArray),
      wgl.STATIC_DRAW
    );

    console.log("🎈 === Instance offset buffer", offsetArray);

    console.log(
      "🎈 === Sphere vertices & Cube  ",
      sphereVertices,
      cubeVertices
    );
  }

  drawSphere(time) {
    let wgl = this.wgl;

    var sphereDrawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)
      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)

      .useProgram(this.objectProgram)

      .vertexAttribPointer(
        this.spherePositionBuffer,
        this.objectProgram.getAttribLocation("a_position"),
        3,
        wgl.FLOAT,
        false,
        0,
        0
      )
      .vertexAttribPointer(
        this.sphereColorBuffer,
        this.objectProgram.getAttribLocation("a_color"),
        4,
        wgl.UNSIGNED_BYTE,
        true,
        0,
        0
      )
      .uniform1f("u_time", time)
      .uniform3f("u_translation", 15, 10, 0)
      .uniformMatrix4fv("u_projectionMatrix", false, this.projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, this.camera.getViewMatrix());

    wgl.drawArrays(sphereDrawState, wgl.TRIANGLES, 0, this.sphereNumElements);
  }

  drawRect() {
    var wgl = this.wgl;

    var width = 100;
    var height = 30;
    var positions = setRectangle(0, 0, width, height);

    this.positionBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.positionBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(positions),
      wgl.STATIC_DRAW
    );

    var transferToGridDrawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)

      .vertexAttribPointer(
        this.positionBuffer,
        this.twoDProgram.getAttribLocation("a_position"),
        2,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .useProgram(this.twoDProgram)
      .uniform2fv("u_translation", [0, 0])
      .uniform2f("u_resolution", this.canvas.width, this.canvas.height)
      .uniform2fv("u_rotation", printSineAndCosineForAnAngle(0))
      .uniform2fv("u_scale", [1, 1]);

    wgl.drawArrays(transferToGridDrawState, wgl.TRIANGLES, 0, 6);
  }

  drawCube(time) {
    const wgl = this.wgl;

    var drawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)
      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)

      .useProgram(this.objectProgram)

      .vertexAttribPointer(
        this.cubeVertexBuffer,
        this.objectProgram.getAttribLocation("a_position"),
        3,
        wgl.FLOAT,
        false,
        0,
        0
      )
      .vertexAttribPointer(
        this.sphereColorBuffer,
        this.objectProgram.getAttribLocation("a_color"),
        4,
        wgl.UNSIGNED_BYTE,
        true,
        0,
        0
      )
      .bindIndexBuffer(this.cubeIndexBuffer)
      .uniform1f("u_time", time)
      .uniform3f("u_translation", 8, 10, 0)
      .uniformMatrix4fv("u_projectionMatrix", false, this.projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, this.camera.getViewMatrix());

    wgl.drawElements(
      drawState,
      wgl.TRIANGLES,
      this.cubeVertices.indices.length,
      wgl.UNSIGNED_BYTE,
      0
    );
  }

  drawCubeInstance(time) {
    const wgl = this.wgl;

    var drawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)
      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)

      .useProgram(this.instanceProgram)

      .vertexAttribPointer(
        this.cubeVertexBuffer,
        this.instanceProgram.getAttribLocation("a_position"),
        3,
        wgl.FLOAT,
        false,
        0,
        0
      )
      .vertexAttribPointer(
        this.sphereColorBuffer,
        this.instanceProgram.getAttribLocation("a_color"),
        4,
        wgl.UNSIGNED_BYTE,
        true,
        0,
        0
      )
      .vertexAttribPointer(
        this.instanceOffsetBuffer,
        this.instanceProgram.getAttribLocation("a_offset"),
        3,
        wgl.FLOAT,
        false,
        0,
        0
      )
      .vertexAttribDivisorANGLE(
        this.instanceProgram.getAttribLocation("a_offset"),
        1
      )

      .bindIndexBuffer(this.cubeIndexBuffer)
      .uniform3f("u_translation", -10, 0, 0)
      .uniformMatrix4fv("u_projectionMatrix", false, this.projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, this.camera.getViewMatrix());

    wgl.drawElementsInstancedANGLE(
      drawState,
      wgl.TRIANGLES,
      this.cubeVertices.indices.length, //indices.length,
      wgl.UNSIGNED_BYTE,
      0,
      INSTANCE_COUNT
    );
  }

  render(time) {
    time *= 0.0005;

    wgl.clear(
      wgl.createClearState().bindFramebuffer(null).clearColor(0.0, 0, 0, 0.1),
      wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    );

    // this.drawRect();
    // this.drawSphere(time);
    // this.drawCube(time);
    this.drawCubeInstance();

    this.box.render();

    requestAnimationFrame(this.render.bind(this));
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

function setRectangle(x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  return new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]);
}

function printSineAndCosineForAnAngle(angleInDegrees) {
  let rotation = [0, 1];
  var angleInRadians = ((360 - angleInDegrees) * Math.PI) / 180;
  rotation[0] = Math.sin(angleInRadians);
  rotation[1] = Math.cos(angleInRadians);
  return rotation;
}
