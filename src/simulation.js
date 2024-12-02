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
import fragmentSimulation from "./shader/simulation.frag";

export default class Simulator {
  time = 0.0;

  constructor(renderer, settings, box, camera) {
    this.renderer = renderer;
    this.settings = settings;
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.camera.position.z = 1;

    if (!renderer.capabilities.maxVertexTextures) {
      console.warn(
        "No support for vertex shader textures gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS!"
      );
    }
    if (!renderer.capabilities.floatFragmentTextures) {
      console.warn("No OES_texture_float support for float textures!");
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
        u_guide: { type: "b", value: false },
        u_box: { type: "v3", value: new THREE.Vector3(BOX[0], BOX[1], BOX[2]) },
      },
      vertexShader: vertexQuad,
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
      var position = randomPoint([BOX[0], BOX[1], BOX[2]]);

      positions[i * 4] = position[0];
      positions[i * 4 + 1] = position[1];
      positions[i * 4 + 2] = position[2];
      positions[i * 4 + 3] = Math.random() * BASE_LIFETIME;
    }

    // * used the buffer to create a DataTexture
    const particlePositionTexture = new THREE.DataTexture(
      positions,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    particlePositionTexture.needsUpdate = true;
    this.particlePositionTextureDefault = particlePositionTexture;

    // this.particlePositionTexture = particlePositionTexture;
    // this.particlePositionsBuffer = positions;

    this._copyTexture(particlePositionTexture, this.positionRenderTarget);
    this._copyTexture(
      this.positionRenderTarget.texture,
      this.positionRenderTarget2
    );
  }

  _copyTexture(input, output) {
    this.mesh.material = this.copyShader;
    this.copyShader.uniforms.texture.value = input;
    this.renderer.setRenderTarget(output);
    this.renderer.render(this.scene, this.camera);
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

  update(dt) {
    if (this.settings.speed === 0.0) return;
    this.time += dt;

    this.simulatorShader.uniforms.u_guide.value = this.settings.showBox;
    this.simulatorShader.uniforms.u_speed.value = this.settings.speed;
    this.simulatorShader.uniforms.u_time.value = this.time;
    this.simulatorShader.uniforms.u_particleTexture.value =
      this.positionRenderTarget2.texture;
    this.simulatorShader.uniforms.u_particleDefaultTexture.value =
      this.particlePositionTextureDefault;

    this.mesh.material = this.simulatorShader;
    this.renderer.setRenderTarget(this.positionRenderTarget);
    this.renderer.render(this.scene, this.camera);

    swap(this, "positionRenderTarget", "positionRenderTarget2");
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

function swap(object, a, b) {
  var temp = object[a];
  object[a] = object[b];
  object[b] = temp;
}
