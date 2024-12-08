"use strict";
import { primitives } from "twgl.js";
import { makeRandomVertexColors, getCubePositions } from "../lib/utilities";

import vertObject from "./shaders/object.vert";
import fragObject from "./shaders/object.frag";
import vert2D from "./shaders/2d.vert";
import frag2D from "./shaders/2d.frag";

const SPHERE_RADIUS = 5;
const SPHERE_STEPS = 8;
const SPHERE_LINES = 6;
const CUBE_SIZE = 10;
const INSTANCE_COUNT = 20;

export default class Object {
  constructor(canvas, wgl, projectionMatrix, camera) {
    this.canvas = canvas;
    this.wgl = wgl;
    this.projectionMatrix = projectionMatrix;
    this.camera = camera;

    this.loadPrograms();
    this.initObject();
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
      for (var j = 0; j < INSTANCE_COUNT; j++) {
        var x = (i / INSTANCE_COUNT) * 40;
        var y = (j / INSTANCE_COUNT) * 40;
        var z = i * 0.2;
        offsetArray.push(x, y, z);
      }
    }

    this.instanceOffsetBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.instanceOffsetBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(offsetArray),
      wgl.STATIC_DRAW
    );

    console.log(
      "🏀 ===  sphereVertices, cubeVertices, offsetArray ",
      sphereVertices,
      cubeVertices,
      offsetArray
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

  render(time) {
    // wgl.clear(
    //   wgl.createClearState().bindFramebuffer(null).clearColor(0.0, 0, 0, 0.1),
    //   wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    // );

    this.drawRect();
    this.drawSphere(time);
    this.drawCube(time);
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
