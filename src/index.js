import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";
import Stats from "stats.js";
import PostProcessing from "./postprocessing/postprocessing";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";

import {
  TEXTURE_WIDTH,
  TEXTURE_HEIGHT,
  AMOUNT,
  BOX,
  BOX_BORDER,
} from "./config";
import Particles from "./particles";
import Simulator from "./simulation";
import PerlinPoints from "./test/perlinPoints";

const BG_COLOR = "#343434";

export default class Example {
  lastTime = 0.0;
  settings = {
    showBox: true,
    resolution: new THREE.Vector2(256, 256),
    speed: 1,
    dieSpeed: 0.015,
    radius: 0,
    curlSize: 0,
    attraction: 0,
  };

  constructor(img) {
    this.img = img;

    this.scene = new THREE.Scene();
    this.scene.position.set(-BOX[0] / 2, -BOX[1] / 2, -BOX[2] / 2);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 30);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(BG_COLOR, 1);
    console.log("whether use webgl2", this.renderer.capabilities.isWebGL2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.camera,
      window.innerWidth,
      window.innerHeight
    );

    this.initGui();
    this.addLights();

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
    this.simulator = new Simulator(
      this.renderer,
      this.settings,
      BOX,
      this.camera
    );

    this.particles = new Particles(
      this.renderer,
      this.scene,
      this.simulator,
      BOX,
      this.camera,
      this.img
    );
    // this.scene.add(this.particles.scene);

    // this.perlinPoints = new PerlinPoints();
    // this.scene.add(this.perlinPoints.container);
  }

  drawBox() {
    const domainBox = new THREE.Object3D();
    for (let i = 0; i < BOX_BORDER.length; i++) {
      const { pos, size } = BOX_BORDER[i];
      const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);

      const material = new THREE.MeshStandardMaterial({
        roughness: 0.1,
        metalness: 0,
        // opacity: 0.8,
        // transparent: true,
      });
      const materialLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x000 })
      );
      materialLine.position.set(pos[0], pos[1], pos[2]);
      // domainBox.add(materialLine);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos[0], pos[1], pos[2]);
      domainBox.add(mesh);
    }
    this.domainBox = domainBox;
    this.domainBox.visible = this.settings.showBox;
    this.scene.add(domainBox);
  }

  addLights() {
    let light = new THREE.AmbientLight(0xffffff);
    this.scene.add(light);

    let light2 = new THREE.DirectionalLight(0xffffff, 4);
    light2.position.set(0.5, 0, 0.866);
    this.scene.add(light2);

    // const particleLight = new THREE.Mesh(
    //   new THREE.SphereGeometry(1, 8, 8),
    //   new THREE.MeshBasicMaterial({ color: 0xffffff })
    // );
    // this.scene.add(particleLight);
    // particleLight.add(new THREE.PointLight(0xffffff, 30));
    // this.particleLight = particleLight;
  }

  initGui() {
    const parent = document.getElementById("side-panel");

    const gui = new GUI({ autoPlace: false });
    gui.domElement.id = "gui";
    gui.domElement.classList.add("gui-customized");

    const simulationFolder = gui.addFolder("Simulation");
    // simulationFolder.add(this, "start").name("Start");
    // simulationFolder.add(this, "stop").name("Stop");
    // simulationFolder.add(this, "reset").name("Reset");

    const renderingFolder = gui.addFolder("Rendering");
    renderingFolder.add(this.settings, "showBox").name("Guides");

    const ssaoPass = this.postProcessing.ssaoPass;
    gui
      .add(ssaoPass, "output", {
        Default: SSAOPass.OUTPUT.Default,
        "SSAO Only": SSAOPass.OUTPUT.SSAO,
        "SSAO Only + Blur": SSAOPass.OUTPUT.Blur,
        Depth: SSAOPass.OUTPUT.Depth,
        Normal: SSAOPass.OUTPUT.Normal,
      })
      .onChange(function (value) {
        ssaoPass.output = value;
      });
    gui.add(ssaoPass, "kernelRadius").min(0).max(32);
    gui.add(ssaoPass, "minDistance").min(0.001).max(0.02);
    gui.add(ssaoPass, "maxDistance").min(0.01).max(0.3);
    gui.add(ssaoPass, "enabled");

    simulationFolder.open();
    renderingFolder.open();
    parent.prepend(gui.domElement);
  }

  animate(currentTime) {
    const time = performance.now() * 0.005;
    const dt = (currentTime - this.lastTime) * 0.001 || 0.0;
    this.lastTime = currentTime;

    // this.perlinPoints.container.visible = false;
    // this.perlinPoints.update(time);

    // this.particleLight.position.x = Math.sin(timer * 7) * 15;
    // this.particleLight.position.y = Math.cos(timer * 5) * 14;
    // this.particleLight.position.z = Math.cos(timer * 3) * 15;

    this.domainBox.visible = this.settings.showBox;

    this.simulator.update(dt);
    this.particles.render();

    this.camera.lookAt(this.scene.position);
    this.controls && this.controls.update();
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.stats.update();

    requestAnimationFrame(this.animate.bind(this));

    this.postProcessing.render(dt);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.postProcessing.resize(window.innerWidth, window.innerHeight);
  }
}

var imageDom = document.getElementById("image-target");
let image = new Image();
image.src = imageDom.src;
image.onload = onImageLoad;

function onImageLoad() {
  new Example(image);
}
