"use strict";
import { primitives } from "twgl.js";
import {
  makeRandomVertexColors,
  getCubePositions,
  generateSphereGeometry,
} from "../lib/utilities";

import vertFullscreen from "./shaders/fullscreen.vert";
import fragFullscreen from "./shaders/fullscreen.frag";
import vertInstance from "./shaders/instance.vert";
import fragInstance from "./shaders/instance.frag";

const SPHERE_RADIUS = 5;
const SPHERE_STEPS = 6;
const SPHERE_LINES = 5;
const CUBE_SIZE = 1;
const INSTANCE_COUNT = 20;

const TEXTURE_WIDTH = 1280;
const TEXTURE_HEIGHT = 1280;

export default class Instance {
  fbo = false; // FBO 离屏渲染无法与实时渲染合并,失去深度

  constructor(canvas, wgl, projectionMatrix, camera, gui) {
    this.canvas = canvas;
    this.wgl = wgl;
    this.projectionMatrix = projectionMatrix;
    this.camera = camera;
    this.gui = gui;

    this.quadVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.quadVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
      wgl.STATIC_DRAW
    );

    this.loadPrograms();
    this.initObject();
  }

  loadPrograms() {
    const programs = this.wgl.createProgramsFromSource({
      instanceProgram: {
        vertexShader: vertInstance,
        fragmentShader: fragInstance,
      },
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

  initObject() {
    this.renderingFramebuffer = wgl.createFramebuffer();
    this.depthRenderBuffer = wgl.createRenderbuffer();
    wgl.renderbufferStorage(
      this.depthRenderBuffer,
      wgl.RENDERBUFFER,
      wgl.DEPTH_COMPONENT16,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT
    );
    this.instanceTexture = wgl.createTexture();
    wgl.rebuildTexture(
      this.instanceTexture,
      wgl.RGBA,
      wgl.UNSIGNED_BYTE,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      null,
      wgl.CLAMP_TO_EDGE,
      wgl.CLAMP_TO_EDGE,
      wgl.LINEAR,
      wgl.LINEAR
    );

    var sphereGeometry = (this.sphereGeometry = generateSphereGeometry(3));
    let sphereVertices = primitives.createSphereVertices(
      SPHERE_RADIUS,
      SPHERE_STEPS,
      SPHERE_LINES
    );
    console.log(
      "🎈 === sphereGeometry, sphereVertices)",
      sphereGeometry,
      sphereVertices
    );

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
  }

  initSphere() {}

  drawSphere(projectionMatrix, viewMatrix) {
    let wgl = this.wgl;

    wgl.framebufferTexture2D(
      this.renderingFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.COLOR_ATTACHMENT0,
      wgl.TEXTURE_2D,
      this.renderingTexture,
      0
    );
    wgl.framebufferRenderbuffer(
      this.renderingFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.DEPTH_ATTACHMENT,
      wgl.RENDERBUFFER,
      this.renderingRenderbuffer
    );

    wgl.clear(
      wgl
        .createClearState()
        .bindFramebuffer(this.renderingFramebuffer)
        .clearColor(-1, -1, -1, -1),
      wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    );

    let sphereDrawState = wgl
      .createDrawState()
      .bindFramebuffer(this.renderingFramebuffer)
      .viewport(0, 0, this.canvas.width, this.canvas.height)

      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)
      .enable(wgl.BLEND)

      .useProgram(this.sphereProgram)

      .vertexAttribPointer(
        this.sphereVertexBuffer,
        this.sphereProgram.getAttribLocation("a_vertexPosition"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribPointer(
        this.sphereNormalBuffer,
        this.sphereProgram.getAttribLocation("a_vertexNormal"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )

      .vertexAttribPointer(
        this.particleVertexBuffer,
        this.sphereProgram.getAttribLocation("a_textureCoordinates"),
        2,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribDivisorANGLE(
        this.sphereProgram.getAttribLocation("a_textureCoordinates"),
        1
      )

      .bindIndexBuffer(this.sphereIndexBuffer)
      .uniformMatrix4fv("u_projectionMatrix", false, projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, viewMatrix)

      .uniformTexture(
        "u_positionsTexture",
        0,
        wgl.TEXTURE_2D,
        this.simulator.particlePositionTexture
      )
      .uniformTexture(
        "u_velocitiesTexture",
        1,
        wgl.TEXTURE_2D,
        this.simulator.particleVelocityTexture
      )
      .uniform1f("u_sphereRadius", this.sphereRadius);

    wgl.drawElementsInstancedANGLE(
      sphereDrawState,
      wgl.TRIANGLES,
      this.sphereGeometry.indices.length,
      wgl.UNSIGNED_SHORT,
      0,
      this.particlesWidth * this.particlesHeight
    );
  }

  drawCubeInstance(time) {
    const wgl = this.wgl;
    if (this.fbo) {
      wgl.framebufferTexture2D(
        this.renderingFramebuffer,
        wgl.FRAMEBUFFER,
        wgl.COLOR_ATTACHMENT0,
        wgl.TEXTURE_2D,
        this.instanceTexture,
        0
      );

      wgl.framebufferRenderbuffer(
        this.renderingFramebuffer,
        wgl.FRAMEBUFFER,
        wgl.DEPTH_ATTACHMENT,
        wgl.RENDERBUFFER,
        this.depthRenderBuffer
      );

      wgl.clear(
        wgl
          .createClearState()
          .bindFramebuffer(this.renderingFramebuffer)
          .clearColor(1, 1, 1, 1),
        wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
      );
    }
    var drawState = wgl
      .createDrawState()
      .bindFramebuffer(this.fbo ? this.bindFramebuffer : null)
      .viewport(
        0,
        0,
        this.fbo ? TEXTURE_WIDTH : this.canvas.width,
        this.fbo ? TEXTURE_HEIGHT : this.canvas.height
      )
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

  drawTmpTexture(texture) {
    let wgl = this.wgl;
    // wgl.clear(
    //   wgl.createClearState().bindFramebuffer(null).clearColor(0, 0, 0, 0),
    //   wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    // );
    var drawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)
      .useProgram(this.fullscreenTextureProgram)
      .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, false, 0, 0)
      .uniformTexture("u_input", 0, wgl.TEXTURE_2D, texture);

    wgl.drawArrays(drawState, wgl.TRIANGLE_STRIP, 0, 4);
  }

  render(time) {
    this.drawCubeInstance();
    this.fbo && this.drawTmpTexture(this.instanceTexture);
  }
}
