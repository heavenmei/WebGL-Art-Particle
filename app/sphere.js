"use strict";
import WrappedGL from "./lib/wrappedgl";
import Camera from "./lib/camera";
import { primitives, m4 } from "twgl.js";
import Utilities, { makeRandomVertexColors } from "./lib/utilities";

import Box from "./box";

import vertSphere from "./shaders/sphereTest.vert";
import fragSphere from "./shaders/sphereTest.frag";
import vert2D from "./shaders/2d.vert";
import frag2D from "./shaders/2d.frag";

const FOV = Math.PI / 3;
const SPHERE_RADIUS = 12;
const SPHERE_STEPS = 10;
const SPHERE_LINES = 6;

export default class Sphere {
  constructor() {
    var canvas = (this.canvas = document.getElementById("canvas"));
    var wgl = (this.wgl = new WrappedGL(canvas));
    wgl ? console.log("=== WebGL init", wgl) : alert("WebGL not supported");
    window.wgl = wgl;

    this.camera = new Camera(this.canvas, [0, 0, 0], 40.0, 0, 0);
    this.projectionMatrix = Utilities.makePerspectiveMatrix(
      new Float32Array(16),
      FOV,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0
    );
    this.initSphereTest();
    this.loadPrograms();

    this.box = new Box(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera
    );

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
      sphereTestProgram: {
        vertexShader: vertSphere,
        fragmentShader: fragSphere,
      },
      twoDProgram: {
        vertexShader: vert2D,
        fragmentShader: frag2D,
      },
    });

    for (let programName in programs) {
      this[programName] = programs[programName];
    }
  }

  initSphereTest() {
    // calc position, normal, texcoord, and vertex color
    let vertices = primitives.createSphereVertices(
      SPHERE_RADIUS,
      SPHERE_STEPS,
      SPHERE_LINES
    );
    const indices = vertices.indices;
    vertices = primitives.deindexVertices(vertices);

    this.numElements =
      vertices.position.length / vertices.position.numComponents;

    const vcolors = makeRandomVertexColors(this.numElements);

    // create buffers
    this.spherePositionBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.spherePositionBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(vertices.position),
      wgl.STATIC_DRAW
    );

    this.colorBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.colorBuffer,
      wgl.ARRAY_BUFFER,
      new Uint8Array(vcolors),
      wgl.STATIC_DRAW
    );
    console.log(
      "🎈 === Sphere: vertices, indices, vcolors",
      vertices,
      indices,
      vcolors
    );
  }

  drawSphere(time) {
    let wgl = this.wgl;

    var viewMatrix = this.camera.getViewMatrix();

    var viewProjectionMatrix = m4.multiply(this.projectionMatrix, viewMatrix);
    var sphereXRotation = time;
    var sphereYRotation = time;
    const u_matrix = computeMatrix(
      viewProjectionMatrix,
      [0.0, 0.0, 0.0],
      sphereXRotation,
      sphereYRotation
    );

    var sphereDrawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)
      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)

      .useProgram(this.sphereTestProgram)

      .vertexAttribPointer(
        this.spherePositionBuffer,
        this.sphereTestProgram.getAttribLocation("a_position"),
        3,
        wgl.FLOAT,
        false,
        0,
        0
      )
      // .vertexAttribPointer(
      //   this.colorBuffer,
      //   this.sphereTestProgram.getAttribLocation("a_color"),
      //   4,
      //   wgl.UNSIGNED_BYTE,
      //   true,
      //   0,
      //   0
      // )
      .uniformMatrix4fv("u_matrix", false, u_matrix);
    // console.log(u_matrix);

    wgl.drawArrays(sphereDrawState, wgl.TRIANGLES, 0, this.numElements);
  }

  drawCube(time) {
    const cubeVertices = primitives.createCubeVertices(20);
    const vertices = primitives.deindexVertices(cubeVertices);

    this.numElements =
      vertices.position.length / vertices.position.numComponents;

    // create buffers
    this.cubePositionBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.cubePositionBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(vertices.position),
      wgl.STATIC_DRAW
    );

    // Compute the projection matrix
    var fieldOfViewRadians = degToRad(60);
    var aspect = this.canvas.width / this.canvas.height;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    // Compute the camera's matrix using look at.
    var cameraPosition = [0, 0, 10];
    var target = [0, 0, 0];
    var up = [0, 1, 0];
    var cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    var sphereXRotation = time;
    var sphereYRotation = time;
    const u_matrix = computeMatrix(
      viewProjectionMatrix,
      [0.0, 0.0, 0.0],
      sphereXRotation,
      sphereYRotation
    );

    var sphereDrawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)
      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)

      .useProgram(this.sphereTestProgram)

      .vertexAttribPointer(
        this.spherePositionBuffer,
        this.sphereTestProgram.getAttribLocation("a_position"),
        3,
        wgl.FLOAT,
        false,
        0,
        0
      )
      .uniformMatrix4fv("u_matrix", false, u_matrix);

    wgl.drawArrays(sphereDrawState, wgl.TRIANGLES, 0, this.numElements);
  }

  draw() {
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

  render(time) {
    time *= 0.0005;
    // console.log("sdsd");

    wgl.clear(
      wgl.createClearState().bindFramebuffer(null).clearColor(0.0, 0, 0, 0.1),
      wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    );

    this.drawSphere(time);
    this.draw();
    this.drawCube(time);

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

function degToRad(d) {
  return (d * Math.PI) / 180;
}

function computeMatrix(
  viewProjectionMatrix,
  translation,
  xRotation,
  yRotation
) {
  var matrix = m4.translate(
    viewProjectionMatrix,
    translation[0],
    translation[1],
    translation[2]
  );

  matrix = m4.rotationX(xRotation, matrix);
  return m4.rotationY(yRotation, matrix);
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
