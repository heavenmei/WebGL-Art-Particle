import Utilities, { normalize } from "../lib/utilities";
import Box, { BOX_X, BOX_Y, BOX_Z } from "./box.js";
import * as THREE from "three";

import vertSphere from "./shaders/sphere.vert";
import fragSphere from "./shaders/sphere.frag";
import vertSphereColor from "./shaders/sphereColor.vert";
import fragSphereColor from "./shaders/sphereColor.frag";
import vertSphereDepth from "./shaders/spheredepth.vert";
import fragSphereDepth from "./shaders/spheredepth.frag";
import vertSphereAO from "./shaders/sphereao.vert";
import fragSphereAO from "./shaders/sphereao.frag";
import fragComposite from "./shaders/composite.frag";
import fragFXAA from "./shaders/fxaa.frag";
import vertFullscreen from "./shaders/fullscreen.vert";

const SHADOW_MAP_WIDTH = 256;
const SHADOW_MAP_HEIGHT = 256;

class Renderer {
  particlesWidth = 0;
  particlesHeight = 0;
  sphereRadius = 0.0;

  constructor(
    canvas,
    wgl,
    projectionMatrix,
    camera,
    gridDimensions,
    simulator,
    settings,
    image
  ) {
    this.canvas = canvas;
    this.wgl = wgl;
    this.projectionMatrix = projectionMatrix;
    this.camera = camera;
    this.simulator = simulator;
    this.settings = settings;
    this.image = image;

    this.wgl.getExtension("OES_texture_float");
    this.wgl.getExtension("OES_texture_float_linear");
    this.wgl.getExtension("ANGLE_instanced_arrays");
    this.depthExt = this.wgl.getExtension("WEBGL_depth_texture");

    this.quadVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.quadVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
      wgl.STATIC_DRAW
    );

    // * create sphere geometry  radius-1, width分段-32, height分段-16
    const geometry = (this.sphereGeometry = new THREE.SphereGeometry(
      1,
      32,
      16
    ));
    this.sphereGeometryIndexCount = geometry.index.count;

    this.sphereVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.sphereVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(geometry.attributes.position.array),
      wgl.STATIC_DRAW
    );

    this.sphereNormalBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.sphereNormalBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array(geometry.attributes.normal.array),

      wgl.STATIC_DRAW
    );

    this.sphereIndexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.sphereIndexBuffer,
      wgl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(geometry.index.array),
      wgl.STATIC_DRAW
    );

    this.depthFramebuffer = wgl.createFramebuffer();
    this.depthTexture = wgl.buildTexture(
      wgl.DEPTH_COMPONENT,
      wgl.UNSIGNED_SHORT,
      SHADOW_MAP_WIDTH,
      SHADOW_MAP_HEIGHT,
      null,
      wgl.CLAMP_TO_EDGE,
      wgl.CLAMP_TO_EDGE,
      wgl.LINEAR,
      wgl.LINEAR
    );

    //we light directly from above
    this.lightViewMatrix = new Float32Array(16);
    var midpoint = [
      gridDimensions[0] / 2,
      gridDimensions[1] / 2,
      gridDimensions[2] / 2,
    ];
    Utilities.makeLookAtMatrix(
      this.lightViewMatrix,
      midpoint,
      [midpoint[0], midpoint[1] - 1.0, midpoint[2]],
      [0.0, 0.0, 1.0]
    );
    this.lightProjectionMatrix = Utilities.makeOrthographicMatrix(
      new Float32Array(16),
      -gridDimensions[0] / 2,
      gridDimensions[0] / 2,
      -gridDimensions[2] / 2,
      gridDimensions[2] / 2,
      -gridDimensions[1] / 2,
      gridDimensions[1] / 2
    );
    this.lightProjectionViewMatrix = new Float32Array(16);
    Utilities.premultiplyMatrix(
      this.lightProjectionViewMatrix,
      this.lightViewMatrix,
      this.lightProjectionMatrix
    );

    // * add lights x = 0.5 光线是从右往左照，y = 0.7 光线从上方往下照， z = 1 说明光线从在场景前方。
    this.directionLight = normalize([0.5, 0.7, 1]);

    // console.log("💡 ", this.directionLight, this.lightProjectionViewMatrix);

    this.box = new Box(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera,
      this.directionLight
    );

    this.particleVertexBuffer = wgl.createBuffer();
    this.renderingFramebuffer = wgl.createFramebuffer();
    this.renderingRenderbuffer = wgl.createRenderbuffer();
    this.renderingTexture = wgl.createTexture();
    this.colorSphereTexture = wgl.createTexture();
    this.occlusionTexture = wgl.createTexture();
    this.compositingTexture = wgl.createTexture();

    // 创建加载图片纹理
    this.imageTexture = wgl.createTexture();
    wgl
      .texImage2D(
        wgl.TEXTURE_2D,
        this.imageTexture,
        0,
        wgl.RGBA,
        wgl.RGBA,
        wgl.UNSIGNED_BYTE,
        this.image
      )
      .setTextureFiltering(
        wgl.TEXTURE_2D,
        this.imageTexture,
        wgl.CLAMP_TO_EDGE,
        wgl.CLAMP_TO_EDGE,
        wgl.NEAREST,
        wgl.NEAREST
      );

    this.loadPrograms();
  }

  loadPrograms() {
    const programs = this.wgl.createProgramsFromSource({
      sphereProgram: {
        vertexShader: vertSphere,
        fragmentShader: fragSphere,
      },
      sphereColorProgram: {
        vertexShader: vertSphereColor,
        fragmentShader: fragSphereColor,
      },
      sphereDepthProgram: {
        vertexShader: vertSphereDepth,
        fragmentShader: fragSphereDepth,
      },
      sphereAOProgram: {
        vertexShader: vertSphereAO,
        fragmentShader: fragSphereAO,
      },
      compositeProgram: {
        vertexShader: vertFullscreen,
        fragmentShader: fragComposite,
        attributeLocations: { a_position: 0 },
      },
      fxaaProgram: {
        vertexShader: vertFullscreen,
        fragmentShader: fragFXAA,
        attributeLocations: { a_position: 0 },
      },
    });

    for (let programName in programs) {
      this[programName] = programs[programName];
    }
  }

  reset(
    particlesWidth,
    particlesHeight,
    sphereRadius,
    particleTextureCoordinates
  ) {
    this.particlesWidth = particlesWidth;
    this.particlesHeight = particlesHeight;
    this.particleCount = particlesWidth * particlesHeight;
    this.sphereRadius = sphereRadius;

    wgl.bufferData(
      this.particleVertexBuffer,
      wgl.ARRAY_BUFFER,
      particleTextureCoordinates,
      wgl.STATIC_DRAW
    );
  }

  /**
   * 画一个球体, save rendering data (normal, speed, depth)
   * @param {*} projectionMatrix - 投影矩阵
   * @param {*} viewMatrix - 视图矩阵
   */
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
      this.sphereGeometryIndexCount,
      wgl.UNSIGNED_SHORT,
      0,
      this.particleCount
    );
  }

  drawColorSphere(projectionMatrix, viewMatrix) {
    let wgl = this.wgl;

    wgl.framebufferTexture2D(
      this.renderingFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.COLOR_ATTACHMENT0,
      wgl.TEXTURE_2D,
      this.colorSphereTexture,
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
        .clearColor(0, 0, 0, 0)
        .clearColor(-1, -1, -1, -1),
      wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    );

    let sphereDrawState = wgl
      .createDrawState()
      .bindFramebuffer(this.renderingFramebuffer)
      .viewport(0, 0, this.canvas.width, this.canvas.height)

      .enable(wgl.DEPTH_TEST)
      .enable(wgl.CULL_FACE)

      .useProgram(this.sphereColorProgram)

      .vertexAttribPointer(
        this.sphereVertexBuffer,
        this.sphereColorProgram.getAttribLocation("a_vertexPosition"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribPointer(
        this.sphereNormalBuffer,
        this.sphereColorProgram.getAttribLocation("a_vertexNormal"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )

      .vertexAttribPointer(
        this.particleVertexBuffer,
        this.sphereColorProgram.getAttribLocation("a_textureCoordinates"),
        2,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribDivisorANGLE(
        this.sphereColorProgram.getAttribLocation("a_textureCoordinates"),
        1
      )

      .bindIndexBuffer(this.sphereIndexBuffer)
      .uniformMatrix4fv("u_projectionMatrix", false, projectionMatrix)
      .uniformMatrix4fv("u_viewMatrix", false, viewMatrix)
      .uniform3fv("u_reverseLightDirection", this.directionLight)

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
      .uniformTexture("u_image", 2, wgl.TEXTURE_2D, this.imageTexture)
      .uniformTexture(
        "u_positionsInitTexture",
        3,
        wgl.TEXTURE_2D,
        this.simulator.particlePositionTextureOriginal
      )
      .uniform2f("u_textureSize", BOX_Z, BOX_X)
      .uniform1f("u_sphereRadius", this.sphereRadius);

    wgl.drawElementsInstancedANGLE(
      sphereDrawState,
      wgl.TRIANGLES,
      this.sphereGeometryIndexCount,
      wgl.UNSIGNED_SHORT,
      0,
      this.particleCount
    );
  }
  // 环境光
  drawOcclusion(projectionMatrix, viewMatrix, fov) {
    let wgl = this.wgl;

    wgl.framebufferTexture2D(
      this.renderingFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.COLOR_ATTACHMENT0,
      wgl.TEXTURE_2D,
      this.occlusionTexture,
      0
    );

    wgl.clear(
      wgl
        .createClearState()
        .bindFramebuffer(this.renderingFramebuffer)
        .clearColor(0.0, 0.0, 0.0, 0.0),
      wgl.COLOR_BUFFER_BIT
    );

    var occlusionDrawState = wgl
      .createDrawState()
      .bindFramebuffer(this.renderingFramebuffer)
      .viewport(0, 0, this.canvas.width, this.canvas.height)

      .enable(wgl.DEPTH_TEST)
      .depthMask(false)

      .enable(wgl.CULL_FACE)

      .enable(wgl.BLEND)
      .blendEquation(wgl.FUNC_ADD)
      .blendFuncSeparate(wgl.ONE, wgl.ONE, wgl.ONE, wgl.ONE)

      .useProgram(this.sphereAOProgram)

      .vertexAttribPointer(
        this.sphereVertexBuffer,
        this.sphereAOProgram.getAttribLocation("a_vertexPosition"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribPointer(
        this.particleVertexBuffer,
        this.sphereAOProgram.getAttribLocation("a_textureCoordinates"),
        2,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribDivisorANGLE(
        this.sphereAOProgram.getAttribLocation("a_textureCoordinates"),
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

      .uniformTexture(
        "u_renderingTexture",
        2,
        wgl.TEXTURE_2D,
        this.renderingTexture
      )
      .uniform2f("u_resolution", this.canvas.width, this.canvas.height)
      .uniform1f("u_fov", fov)

      .uniform1f("u_sphereRadius", this.sphereRadius);

    wgl.drawElementsInstancedANGLE(
      occlusionDrawState,
      wgl.TRIANGLES,
      this.sphereGeometryIndexCount,
      wgl.UNSIGNED_SHORT,
      0,
      this.particleCount
    );
  }

  drawDepthMap() {
    let wgl = this.wgl;

    wgl.framebufferTexture2D(
      this.depthFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.DEPTH_ATTACHMENT,
      wgl.TEXTURE_2D,
      this.depthTexture,
      0
    );

    wgl.clear(
      wgl
        .createClearState()
        .bindFramebuffer(this.depthFramebuffer)
        .clearColor(0, 0, 0, 0),
      wgl.DEPTH_BUFFER_BIT
    );

    var depthDrawState = wgl
      .createDrawState()
      .bindFramebuffer(this.depthFramebuffer)
      .viewport(0, 0, SHADOW_MAP_WIDTH, SHADOW_MAP_HEIGHT)

      .enable(wgl.DEPTH_TEST)
      .depthMask(true)

      //so no occlusion past end of shadow map (with clamp to edge)
      .enable(wgl.SCISSOR_TEST)
      .scissor(1, 1, SHADOW_MAP_WIDTH - 2, SHADOW_MAP_HEIGHT - 2)

      .colorMask(false, false, false, false)

      .enable(wgl.CULL_FACE)

      .useProgram(this.sphereDepthProgram)

      .vertexAttribPointer(
        this.sphereVertexBuffer,
        this.sphereDepthProgram.getAttribLocation("a_vertexPosition"),
        3,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribPointer(
        this.particleVertexBuffer,
        this.sphereDepthProgram.getAttribLocation("a_textureCoordinates"),
        2,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )
      .vertexAttribDivisorANGLE(
        this.sphereDepthProgram.getAttribLocation("a_textureCoordinates"),
        1
      )

      .bindIndexBuffer(this.sphereIndexBuffer)

      .uniformMatrix4fv(
        "u_projectionViewMatrix",
        false,
        this.lightProjectionViewMatrix
      )

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
      depthDrawState,
      wgl.TRIANGLES,
      this.sphereGeometryIndexCount,
      wgl.UNSIGNED_SHORT,
      0,
      this.particleCount
    );
  }

  // 合成
  drawComposite(viewMatrix, fov) {
    let wgl = this.wgl;

    var inverseViewMatrix = Utilities.invertMatrix(
      new Float32Array(16),
      viewMatrix
    );

    wgl.framebufferTexture2D(
      this.renderingFramebuffer,
      wgl.FRAMEBUFFER,
      wgl.COLOR_ATTACHMENT0,
      wgl.TEXTURE_2D,
      this.compositingTexture,
      0
    );

    wgl.clear(
      wgl
        .createClearState()
        .bindFramebuffer(this.renderingFramebuffer)
        .clearColor(0, 0, 0, 0),
      wgl.COLOR_BUFFER_BIT
    );

    var compositeDrawState = wgl
      .createDrawState()
      .bindFramebuffer(this.renderingFramebuffer)
      .viewport(0, 0, this.canvas.width, this.canvas.height)
      .enable(wgl.BLEND)

      .useProgram(this.compositeProgram)

      .vertexAttribPointer(
        this.quadVertexBuffer,
        0,
        2,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )

      .uniformTexture(
        "u_renderingTexture",
        0,
        wgl.TEXTURE_2D,
        this.renderingTexture
      )
      .uniformTexture(
        "u_occlusionTexture",
        1,
        wgl.TEXTURE_2D,
        this.occlusionTexture
      )
      .uniformTexture(
        "u_shadowDepthTexture",
        2,
        wgl.TEXTURE_2D,
        this.depthTexture
      )
      .uniformTexture(
        "u_colorSphereTexture",
        3,
        wgl.TEXTURE_2D,
        this.colorSphereTexture
      )

      .uniform2f("u_resolution", this.canvas.width, this.canvas.height)
      .uniform2f("u_shadowResolution", SHADOW_MAP_WIDTH, SHADOW_MAP_HEIGHT)
      .uniform1f("u_fov", fov)
      .uniformMatrix4fv("u_inverseViewMatrix", false, inverseViewMatrix)
      .uniformMatrix4fv(
        "u_lightProjectionViewMatrix",
        false,
        this.lightProjectionViewMatrix
      );

    wgl.drawArrays(compositeDrawState, wgl.TRIANGLE_STRIP, 0, 4);
  }

  // 快速近似抗锯齿（FXAA）
  drawFXAA() {
    let wgl = this.wgl;

    var fxaaDrawState = wgl
      .createDrawState()
      .bindFramebuffer(null)
      .viewport(0, 0, this.canvas.width, this.canvas.height)

      .useProgram(this.fxaaProgram)

      .vertexAttribPointer(
        this.quadVertexBuffer,
        0,
        2,
        wgl.FLOAT,
        wgl.FALSE,
        0,
        0
      )

      .uniformTexture("u_input", 0, wgl.TEXTURE_2D, this.compositingTexture)
      .uniform2f("u_resolution", this.canvas.width, this.canvas.height);

    wgl.drawArrays(fxaaDrawState, wgl.TRIANGLE_STRIP, 0, 4);
  }

  draw() {
    const projectionMatrix = this.projectionMatrix;
    const viewMatrix = this.camera.getViewMatrix();
    const fov = 2.0 * Math.atan(1.0 / projectionMatrix[5]);

    // 视频采样 readyState >= 2 表示视频已准备好
    if (
      this.image instanceof HTMLVideoElement &&
      this.image &&
      this.image.readyState >= 2
    ) {
      wgl
        .texImage2D(
          wgl.TEXTURE_2D,
          this.imageTexture,
          0,
          wgl.RGBA,
          wgl.RGBA,
          wgl.UNSIGNED_BYTE,
          this.image
        )
        .setTextureFiltering(
          wgl.TEXTURE_2D,
          this.imageTexture,
          wgl.CLAMP_TO_EDGE,
          wgl.CLAMP_TO_EDGE,
          wgl.NEAREST,
          wgl.NEAREST
        );
    }

    this.drawSphere(projectionMatrix, viewMatrix);
    this.drawColorSphere(projectionMatrix, viewMatrix);
    // this.drawOcclusion(projectionMatrix, viewMatrix, fov);
    this.drawDepthMap();
    this.drawComposite(viewMatrix, fov);

    this.settings.showBox && this.box.drawBoxes(this.renderingFramebuffer);

    // * post processing
    this.drawFXAA();
  }

  onResize() {
    wgl.renderbufferStorage(
      this.renderingRenderbuffer,
      wgl.RENDERBUFFER,
      wgl.DEPTH_COMPONENT16,
      this.canvas.width,
      this.canvas.height
    );

    wgl.rebuildTexture(
      this.renderingTexture,
      wgl.RGBA,
      wgl.FLOAT,
      this.canvas.width,
      this.canvas.height,
      null,
      wgl.CLAMP_TO_EDGE,
      wgl.CLAMP_TO_EDGE,
      wgl.LINEAR,
      wgl.LINEAR
    ); //contains (normal.x, normal.y, speed, depth)

    wgl.rebuildTexture(
      this.colorSphereTexture,
      wgl.RGBA,
      wgl.FLOAT,
      this.canvas.width,
      this.canvas.height,
      null,
      wgl.CLAMP_TO_EDGE,
      wgl.CLAMP_TO_EDGE,
      wgl.LINEAR,
      wgl.LINEAR
    ); //contains (normal.x, normal.y, speed, depth)

    wgl.rebuildTexture(
      this.occlusionTexture,
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

    wgl.rebuildTexture(
      this.compositingTexture,
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
  }
}

export default Renderer;
