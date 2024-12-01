import * as THREE from "three";
import { IcosahedronGeometry, Points, ShaderMaterial, Object3D } from "three";

import Stats from "stats.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";

import { TEXTURE_WIDTH, TEXTURE_HEIGHT, AMOUNT, BOX, options } from "./config";
import Renderer from "./renderer";
import Simulator from "./simulation";

import vertexParticles from "./test/particles.vert";
import fragmentParticles from "./test/particles.frag";

const BG_COLOR = "#343434";

export default class Example {
  settings = {
    showGuides: true,
    resolution: new THREE.Vector2(256, 256),
  };

  constructor(img) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(-15, 0, 30);
    this.scene.position.set(-BOX[0] / 2, -BOX[1] / 2, -BOX[2] / 2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(BG_COLOR, 1);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.initGui();
    this.addLights();

    this.simulator = new Simulator(this.renderer, this.scene, BOX, this.camera);

    this.particles = new Renderer(
      this.renderer,
      this.scene,
      this.simulator,
      BOX,
      this.camera,
      img
    );
    this.scene.add(this.particles.container);

    this.stats = new Stats();
    this.start = Date.now();
    this.startScene();
    this.animate();

    document.body.appendChild(this.stats.dom);
    document.body.appendChild(this.renderer.domElement);
    window.addEventListener("resize", this.onWindowResize, false);
  }

  startScene() {
    this.drawBox();
    // this.drawPerlin();
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
    this.scene.add(this.perlin);
  }

  drawBox() {
    const geometryDomainBox = new THREE.BoxGeometry(BOX[0], BOX[1], BOX[2]);
    console.log(geometryDomainBox);

    this.domainBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometryDomainBox),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );

    this.domainBox.position.set(BOX[0] / 2, BOX[1] / 2, BOX[2] / 2);
    this.domainBox.visible = this.settings.showGuides;
    this.scene.add(this.domainBox);
  }

  animate() {
    const time = performance.now() * 0.0005;

    // this.animatePerlin();
    // this.animateMaterial();

    // this.simulator.update();
    // this.simulator.updateTest();
    this.particles.render(time);

    this.camera.lookAt(this.scene.position);
    this.controls && this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.stats.update();

    requestAnimationFrame(this.animate.bind(this));
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

  addLights() {
    let light = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(light);

    let light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(0.5, 0, 0.866);
    this.scene.add(light2);

    const light3 = new THREE.HemisphereLight(0xffffff, 0x888888, 3);
    light.position.set(0, 1, 0);
    this.scene.add(light3);
  }

  initGui() {
    const parent = document.getElementById("side-panel");

    this._gui = new GUI({ autoPlace: false });
    this._gui.domElement.id = "gui";
    this._gui.domElement.classList.add("gui-customized");

    const simulationFolder = this._gui.addFolder("Simulation");
    // simulationFolder.add(this, "start").name("Start");
    // simulationFolder.add(this, "stop").name("Stop");
    // simulationFolder.add(this, "reset").name("Reset");

    const renderingFolder = this._gui.addFolder("Rendering");
    renderingFolder.add(this.settings, "showGuides").name("Guides");

    simulationFolder.open();
    renderingFolder.open();
    parent.prepend(this._gui.domElement);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

var imageDom = document.getElementById("image-target");
let image = new Image();
image.src = imageDom.src;
image.onload = onImageLoad;

function onImageLoad() {
  new Example(image);
}
