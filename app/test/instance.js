"use strict";

import { makeRandomVertexColors, getCubePositions } from "../lib/utilities";

import vertInstance from "./shaders/instance.vert";
import fragInstance from "./shaders/instance.frag";

const CUBE_SIZE = 1;
const INSTANCE_COUNT = 20;

export default class Instance {
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
    const sphereColors = makeRandomVertexColors(50);
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

    console.log("🎈 === Instance offset buffer", offsetArray);
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
      .uniform3f("u_translation", -5, -5, 0)
      .uniformMatrix4fv("u_projectionMatrix", false, this.projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, this.camera.getViewMatrix());

    wgl.drawElementsInstancedANGLE(
      drawState,
      wgl.TRIANGLES,
      this.cubeVertices.indices.length, //indices.length,
      wgl.UNSIGNED_BYTE,
      0,
      INSTANCE_COUNT * INSTANCE_COUNT
    );
  }

  render(time) {
    this.drawCubeInstance();
  }
}
