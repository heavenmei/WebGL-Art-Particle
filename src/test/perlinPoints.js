import * as THREE from "three";
import { Points, ShaderMaterial, Object3D } from "three";

import vertexParticles from "./particles.vert";
import fragmentParticles from "./particles.frag";

const options = {
  perlin: {
    vel: 0.002,
    speed: 0.0005,
    perlins: 0.0001,
    decay: 0.1,
    complex: 0.3,
    waves: 10.0,
    eqcolor: 1.0,
    fragment: true,
    redhell: true,
  },
  spin: {
    sinVel: 0.0,
    ampVel: 80.0,
  },
};

export default class PerlinPoints {
  constructor() {
    this.container = new THREE.Object3D();

    this.start = Date.now();
    this.drawPerlin();
  }

  drawPerlin() {
    this.perlinMaterial = new ShaderMaterial({
      wireframe: false,
      uniforms: {
        time: {
          type: "f",
          value: 0.0,
        },
        pointscale: {
          type: "f",
          value: 0.0,
        },
        decay: {
          type: "f",
          value: 0.0,
        },
        complex: {
          type: "f",
          value: 0.0,
        },
        waves: {
          type: "f",
          value: 0.0,
        },
        eqcolor: {
          type: "f",
          value: 0.0,
        },
        fragment: {
          type: "i",
          value: true,
        },
        redhell: {
          type: "i",
          value: true,
        },
      },
      vertexShader: vertexParticles,
      fragmentShader: fragmentParticles,
    });

    const geometry = new THREE.IcosahedronGeometry(10, 80);
    const mesh = new Points(geometry, this.perlinMaterial);
    this.perlin = new Object3D();
    this.perlin.add(mesh);
    this.container.add(this.perlin);
  }

  animatePerlin() {
    const { sinVel, ampVel } = options.spin;
    const performance = Date.now() * 0.003;
    this.perlin.rotation.x +=
      (Math.sin(performance * sinVel) * ampVel * Math.PI) / 180;
    this.perlin.rotation.y += options.perlin.vel;
  }

  animateMaterial() {
    const material = this.perlinMaterial;
    material.uniforms["time"].value =
      options.perlin.speed * (Date.now() - this.start);
    material.uniforms["pointscale"].value = options.perlin.perlins;
    material.uniforms["decay"].value = options.perlin.decay;
    material.uniforms["complex"].value = options.perlin.complex;
    material.uniforms["waves"].value = options.perlin.waves;
    material.uniforms["eqcolor"].value = options.perlin.eqcolor;
    material.uniforms["fragment"].value = options.perlin.fragment;
    material.uniforms["redhell"].value = options.perlin.redhell;
  }

  update() {
    this.animatePerlin();
    this.animateMaterial();
  }
}
