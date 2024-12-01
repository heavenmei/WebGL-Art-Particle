import * as THREE from "three";

import { TEXTURE_WIDTH, TEXTURE_HEIGHT, AMOUNT, BOX } from "./config";

import vertexSphere from "./shader/sphere.vert";
import fragmentSphere from "./shader/sphere.frag";
import vertexBillboard from "./test/billboard.vert";
import fragmentBillboard from "./test/billboard.frag";
import circleImage from "../images/circle.png";
import targetImage from "../images/art.jpg";

export default class Renderer {
  particleCount = AMOUNT;

  constructor(wgl, scene, simulator, box, camera, img, onload) {
    this.wgl = wgl;
    this.scene = scene;
    this.box = box;
    this.simulator = simulator;
    this.camera = camera;
    this.img = img;
    this.container = new THREE.Object3D();

    this.imgTexture = new THREE.Texture(this.img);

    // * fill particle vertex buffer containing the relevant texture coordinates
    var particleTextureCoordinates = new Float32Array(AMOUNT * 2);
    for (var y = 0; y < TEXTURE_HEIGHT; ++y) {
      for (var x = 0; x < TEXTURE_WIDTH; ++x) {
        particleTextureCoordinates[(y * TEXTURE_WIDTH + x) * 2] =
          (x + 0.5) / TEXTURE_WIDTH;
        particleTextureCoordinates[(y * TEXTURE_WIDTH + x) * 2 + 1] =
          (y + 0.5) / TEXTURE_HEIGHT;
      }
    }
    this.particleTextureCoordinates = particleTextureCoordinates;

    // this.drawParticles();
    this.drawBillboard();
  }

  drawParticles() {
    const geometry = new THREE.IcosahedronGeometry(0.1, 3);

    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.shadowmap,
        {
          map: {
            value: new THREE.TextureLoader().load(circleImage),
          },
          u_image: {
            type: "t",
            value: new THREE.TextureLoader().load(targetImage),
          },
          u_box2img: {
            value: new THREE.Vector2(
              BOX[0] / this.img.width,
              BOX[1] / this.img.height
            ),
          },

          u_positionsTexture: {
            type: "t",
            value: this.simulator.particlePositionTextureDefault,
          },
          u_positionsDefaultTexture: {
            type: "t",
            value: this.simulator.particlePositionTextureDefault,
          },
        },
      ]),
      vertexShader: vertexSphere,
      fragmentShader: fragmentSphere,
      blending: THREE.NoBlending,
    });

    material.needsUpdate = true;
    const instancedMesh = new THREE.InstancedMesh(geometry, material, AMOUNT);

    instancedMesh.geometry.setAttribute(
      "a_textureCoordinates",
      new THREE.InstancedBufferAttribute(
        new Float32Array(this.particleTextureCoordinates),
        2
      )
    );

    this.instancedMesh = instancedMesh;
    this.container.add(this.instancedMesh);
  }

  drawBillboard() {
    const circleGeometry = new THREE.CircleGeometry(0.1, 6);

    let geometry = new THREE.InstancedBufferGeometry();
    geometry.index = circleGeometry.index;
    geometry.attributes = circleGeometry.attributes;

    geometry.setAttribute(
      "translate",
      new THREE.InstancedBufferAttribute(
        this.simulator.particlePositionsBuffer,
        4
      )
    );

    geometry.setAttribute(
      "textureCoordinates",
      new THREE.InstancedBufferAttribute(this.particleTextureCoordinates, 2)
    );

    const material = new THREE.RawShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        map: {
          value: new THREE.TextureLoader().load(circleImage),
        },
        u_box2img: {
          value: new THREE.Vector2(
            BOX[0] / this.img.width,
            BOX[1] / this.img.height
          ),
        },
        u_image: {
          type: "t",
          value: new THREE.TextureLoader().load(targetImage),
        },
        u_positionsTexture: {
          type: "t",
          value: this.simulator.particlePositionTextureDefault,
        },
        // ...THREE.UniformsUtils.merge([
        //   {
        //     u_positionsTexture: {
        //       value: this.simulator.particlePositionTextureDefault,
        //     },
        //   },
        // ]),
      },
      vertexShader: vertexBillboard,
      fragmentShader: fragmentBillboard,
      blending: THREE.NoBlending,

      // depthTest: true,
      // depthWrite: true,
    });

    let mesh = new THREE.Mesh(geometry, material);

    const particlePositionTexture = new THREE.DataArrayTexture(
      this.simulator.particlePositionsBuffer,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      THREE.RGBAFormat,
      THREE.FloatType
    );

    mesh.material.uniforms.u_positionsTexture.value = particlePositionTexture;
    mesh.material.needsUpdate = true;

    this.scene.add(mesh);
    this.billboardMesh = mesh;
  }

  render(time) {
    if (this.billboardMesh) {
      // this.billboardMesh.material.uniforms["time"].value = time;
      // this.billboardMesh.rotation.x = time * 0.2;
      // this.billboardMesh.rotation.y = time * 0.4;
      // this.billboardMesh.material.uniforms.u_positionsTexture =
      //   this.simulator.particlePositionTextureDefault;
    }

    // const simulator = this.simulator;
    // const material = this.instancedMesh.material;
    // const mesh = this.instancedMesh;
    // material.uniforms["time"].value =
    //   options.perlin.speed * (Date.now() - currentTime);
    // material.uniforms["pointscale"].value = options.perlin.perlins;
    // material.uniforms["decay"].value = options.perlin.decay;
    // material.uniforms["complex"].value = options.perlin.complex;
    // material.uniforms["waves"].value = options.perlin.waves;
    // material.uniforms["eqcolor"].value = options.perlin.eqcolor;
    // material.uniforms["fragment"].value = options.perlin.fragment;
    // material.uniforms["redhell"].value = options.perlin.redhell;
    // material.needsUpdate = true;
    // this.instancedMesh.geometry.setAttribute(
    //   "instancePosition",
    //   new THREE.InstancedBufferAttribute(
    //     new Float32Array(this.simulator.particlePositionsBuffer),
    //     4
    //   )
    // );
    // console.log(this.simulator.positionRenderTarget);
    // const pTexture = this.simulator.positionRenderTarget.texture;
    // material.uniforms.u_positionsTexture.value =
    //   simulator.positionRenderTarget.texture;
    // // material.uniforms.u_positionsTexture.value =
    // //   simulator.particlePositionTexture;
    // material.needsUpdate = true;
  }
}
