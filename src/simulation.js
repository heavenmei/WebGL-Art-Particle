import * as THREE from "three";
import {
  TEXTURE_WIDTH,
  TEXTURE_HEIGHT,
  AMOUNT,
  BOX,
  BASE_LIFETIME,
} from "./config";

import vertexQuad from "./shader/quad.vert";
import fragmentThrough from "./shader/through.frag";
// import fragmentPosition from "./shader/position.frag";
import vertexSimulation from "./shader/simulation.vert";
import fragmentSimulation from "./shader/simulation.frag";

export default class Simulator {
  settings = {
    speed: 1,
    dieSpeed: 0.015,
    radius: 0,
    curlSize: 0,
    attraction: 0,
  };
  time = 0.0;
  _followPointTime = 0;

  constructor(wgl, scene, box, camera) {
    this.wgl = wgl;
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (!wgl.capabilities.maxVertexTextures) {
      console.warn(
        "No support for vertex shader textures gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS!"
      );
      return;
    }
    if (!wgl.capabilities.floatFragmentTextures) {
      console.warn("No OES_texture_float support for float textures!");
      return;
    }

    this.copyShader = new THREE.RawShaderMaterial({
      uniforms: {
        resolution: {
          type: "v2",
          value: new THREE.Vector2(TEXTURE_WIDTH, TEXTURE_HEIGHT),
        },
        texture: { type: "t", value: undefined },
      },
      vertexShader: vertexQuad,
      fragmentShader: fragmentThrough,
    });

    this.simulatorShader = new THREE.RawShaderMaterial({
      uniforms: {
        u_resolution: {
          type: "v2",
          value: new THREE.Vector2(TEXTURE_WIDTH, TEXTURE_HEIGHT),
        },
        u_particleTexture: { type: "t", value: undefined },
        u_particleDefaultTexture: { type: "t", value: undefined },
        u_speed: { type: "f", value: 1 },
        u_time: { type: "f", value: 0 },
      },
      vertexShader: vertexSimulation,
      fragmentShader: fragmentSimulation,
      blending: THREE.NoBlending,
      transparent: false,
      depthWrite: false,
      depthTest: false,
    });

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      this.copyShader
    );
    this.scene.add(this.mesh);

    this.positionRenderTarget = new THREE.WebGLRenderTarget(
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthWrite: false,
        depthBuffer: false,
        stencilBuffer: false,
      }
    );

    this.positionRenderTarget2 = this.positionRenderTarget.clone();
    this.reset();
  }

  reset() {
    // * generate initial particle positions
    const positions = new Float32Array(AMOUNT * 4);
    for (var i = 0; i < AMOUNT; ++i) {
      var position = randomPoint([BOX[0], BOX[1], BOX[2] / 2]);

      positions[i * 4] = position[0];
      positions[i * 4 + 1] = position[1];
      positions[i * 4 + 2] = position[2];
      positions[i * 4 + 3] = Math.random() * BASE_LIFETIME;
    }

    const particlePositionTexture = new THREE.DataTexture(
      positions,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      THREE.RGBAFormat,
      THREE.FloatType
    );

    this.particlePositionTexture = particlePositionTexture;
    this.particlePositionTextureDefault = particlePositionTexture;
    this.particlePositionsBuffer = positions;

    // this.copyShader.uniforms.texture.value = particlePositionTexture;

    // this.mesh.material = this.copyShader;
    // this.mesh.material.needsUpdate = true;
    // this.wgl.render(this.scene, this.camera, this.positionRenderTarget);
    // this._copyTexture(this.particlePositionTexture, this.positionRenderTarget);
    // this._copyTexture(this.positionRenderTarget, this.positionRenderTarget2);
  }

  _copyTexture(input, output) {
    this.mesh.material = this.copyShader;
    this.copyShader.uniforms.texture.value = input;
    this.renderer.render(this.scene, this.camera, output);
  }

  updateTest(dt) {
    const positions = new Float32Array(AMOUNT * 4);
    for (var i = 0; i < AMOUNT; ++i) {
      var position = randomPoint([BOX[0], BOX[1], BOX[2] / 2]);

      positions[i * 4] = position[0];
      positions[i * 4 + 1] = position[1];
      positions[i * 4 + 2] = position[2];
      positions[i * 4 + 3] = Math.random() * BASE_LIFETIME;
    }
    const particlePositionTexture = new THREE.DataTexture(
      positions,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    particlePositionTexture.needsUpdate = true;
    this.particlePositionTexture = particlePositionTexture;
  }

  swap() {
    let tmp = this.positionRenderTarget;
    this.positionRenderTarget = this.positionRenderTarget2;
    this.positionRenderTarget2 = tmp;
  }

  update(dt) {
    if (this.settings.speed === 0.0) return;
    this.time += dt;
    const wgl = this.wgl;

    var autoClearColor = wgl.autoClearColor;
    // var clearColor = wgl.getClearColor().getHex();
    var clearAlpha = wgl.getClearAlpha();

    this.simulatorShader.uniforms.u_speed.value = this.settings.speed;
    this.simulatorShader.uniforms.u_time.value = this.time;
    this.simulatorShader.uniforms.u_particleTexture.value =
      this.positionRenderTarget2;
    this.simulatorShader.uniforms.u_particleDefaultTexture.value =
      this.particlePositionTextureDefault;

    this.mesh.material = this.simulatorShader;

    this.swap();
    this.renderer.render(this.scene, this.camera, this.positionRenderTarget);
  }
}

//random point in this AABB
export function randomPoint(max) {
  var point = [];
  for (var i = 0; i < 3; ++i) {
    point[i] = Math.random() * max[i];
  }
  return point;
}
