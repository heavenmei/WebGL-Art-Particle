"use strict";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";

import {
  calculateDensityAndPressureOptimized,
  calculateForcesOptimized,
  calculateDensityAndPressure,
  calculateForces,
} from "./utils";

// Class to represent a particle in the simulation
class Particle {
  constructor(position, velocity, index, settings) {
    this.position = position;
    this.velocity = velocity;
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.mass = settings.particlesMass;
    this.density = 0;
    this.pressure = 0;
    this.forces = new THREE.Vector3(0, 0, 0);
    this.index = index;
  }
}

class SPH {
  settings = {
    boxWidth: 4, // Width of the simulation box
    boxHeight: 4, // Height of the simulation box
    boxDepth: 3, // Depth of the simulation box (only used in 3D)

    numberOfParticles: 12, // Number of particles in each dimension
    particlesDimensions: 0.12, // Diameter of the particles
    particleSpacing: 0.3, // Initial spacing between the particles
    useGridOptimization: true, // Set to true to use a grid optimization for the SPH calculations
    BoxRestitution: 0.2, // Restitution of the box walls, higher values will make the particles to bounce more on the walls

    timeStep: 0.0, // Simulation time step
    smoothingLength: 0.5, // Radius of the smoothing kernel, higher values will check more neighbors particles for calculations
    gravity: 5, // Gravity force applied to the particles
    referenceDensity: 0.9, // Target density for the fluid, higher values will make the particles to be more compressed
    gasConstant: 0.3, // Gas constant for the equation of state, higher values will make the fluid more incompressible
    viscosity: 5, // todo unused
    // Viscosity of the fluid, higher values will make the relative velocity of the particles to be more similar

    sizeScale: true,
    particlesRoughness: 0, // Roughness of the particles, higher values will make the particles to be less smooth
    particlesMass: 0.3, // Mass of the particles, higher values will affect interactions and forces between particles, impacting the simulation dynamics
    particlesMetalness: 0, // Metalness of the particles, higher values will make the particles to be more reflective
  };

  constructor(gui, image) {
    this.image = image;
    this.gui = gui;
    var canvas = (this.canvas = document.getElementById("canvas"));

    let renderer = (this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    }));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x343434);

    const camera = (this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    ));
    camera.position.set(0, 0, 7);

    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.initGui();
    this.addLight();

    this.reset();
    this.init();
    // this.initParticleColor();

    this.animate();

    window.addEventListener("resize", this.onResize.bind(this));
  }

  initGui() {
    const stats = new Stats();
    this.stats = stats;
    document.body.appendChild(stats.domElement);

    const settings = this.settings;
    const gui = this.gui;
    gui.width = 300;
    gui.add(this, "reset").name("Reset");
    gui
      .add(
        {
          play: () => {
            this.settings.timeStep = this.settings.timeStep ? 0 : 0.15;
          },
        },
        "play"
      )
      .name("Play/Pause");
    gui
      .add(
        {
          toggleGravity: () => {
            settings.gravity = settings.gravity === 0 ? 9 : 0;
          },
        },
        "toggleGravity"
      )
      .name("Toggle Gravity");
    gui
      .add(
        {
          toggleGridOptimization: () => {
            settings.useGridOptimization = !settings.useGridOptimization;
          },
        },
        "toggleGridOptimization"
      )
      .name("Toggle Grid Optimization");

    const simulationFolder = gui.addFolder("Simulation");
    simulationFolder.open();
    simulationFolder
      .add(settings, "timeStep", 0.0, 0.4, 0.01)
      .name("Time Step")
      .listen();
    simulationFolder
      .add(settings, "smoothingLength", 0.01, 2.0)
      .name("Smoothing Length");
    simulationFolder.add(settings, "gravity", 0, 15).name("Gravity").listen();
    simulationFolder
      .add(settings, "referenceDensity", 0.01, 10)
      .name("Reference Density");
    simulationFolder.add(settings, "gasConstant", 0.01, 2).name("Gas Constant");
    simulationFolder.add(settings, "viscosity", 0, 10).name("Viscosity");

    const renderingFolder = gui.addFolder("Rendering");
    renderingFolder.open();
    renderingFolder.add(settings, "sizeScale").name("Size Scale");
    renderingFolder
      .add(settings, "particlesRoughness", 0, 1, 0.1)
      .name("Roughness")
      .onChange((value) => {
        settings.particlesRoughness = value;
        this.instancedMaterial.roughness = settings.particlesRoughness;
      })
      .listen();

    // 质量
    renderingFolder
      .add(settings, "particlesMass", 0.1, 1)
      .name("Mass")
      .onChange((value) => {
        settings.particlesMass = value;
        for (let i = 0; i < this.particles.length; i++) {
          this.particles[i].mass = settings.particlesMass;
        }
      });

    //  金属感
    renderingFolder
      .add(settings, "particlesMetalness", 0, 1)
      .name("Metalness")
      .onChange((value) => {
        settings.particlesMetalness = value;
        this.instancedMaterial.metalness = settings.particlesMetalness;
      });
  }

  addLight() {
    // Add an ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    this.scene.add(ambientLight);

    // Add a directional light to the scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);
  }

  // Function to create a grid of particles in the simulation box
  gridOfParticles(x, y, z, boxWidth, boxHeight, boxDepth, spacing) {
    const particles = [];
    let index = 0;
    for (let i = 0; i < x; i++) {
      for (let j = 0; j < y; j++) {
        for (let k = 0; k < z; k++) {
          const position = new THREE.Vector3(
            i * spacing - boxWidth / 2 + Math.random() * 0.01,
            j * spacing - boxHeight / 2 + Math.random() * 0.01,
            k * spacing - boxDepth / 2 + Math.random() * 0.01
          );
          const velocity = new THREE.Vector3(0, 0, 0);
          const particle = new Particle(
            position,
            velocity,
            index,
            this.settings
          );
          particles.push(particle);
          index++;
        }
      }
    }
    return particles;
  }

  init() {
    const { settings, scene } = this;
    const sphereGeometry = new THREE.SphereGeometry(
      settings.particlesDimensions,
      16,
      16
    );
    const cubeGeometry = new THREE.BoxGeometry(
      settings.boxWidth,
      settings.boxHeight,
      settings.boxDepth
    );

    // Create a cube as bounding box for the simulation
    let cubeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
    });
    let cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);

    this.instancedMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: settings.particlesMetalness,
      roughness: settings.particlesRoughness,
    });
    this.instancedMesh = new THREE.InstancedMesh(
      sphereGeometry,
      this.instancedMaterial,
      this.particles.length
    );
    scene.add(this.instancedMesh);
  }

  reset() {
    const { settings } = this;
    this.particles = this.gridOfParticles(
      settings.numberOfParticles,
      settings.numberOfParticles,
      settings.numberOfParticles,
      settings.boxWidth,
      settings.boxHeight,
      settings.boxDepth,
      settings.particleSpacing
    );
  }

  // ! 为每个实例设置颜色
  initParticleColor() {
    const { settings } = this;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = this.image.width;
    canvas.height = this.image.height;
    context.drawImage(this.image, 0, 0, this.image.width, this.image.height);
    const imageData = context.getImageData(
      0,
      0,
      this.image.width,
      this.image.height
    ).data;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const x = Math.floor(
        ((particle.position.x + settings.boxWidth / 2) / settings.boxWidth) *
          this.image.width
      );
      const y = Math.floor(
        ((particle.position.y + settings.boxHeight / 2) / settings.boxHeight) *
          this.image.height
      );

      //   const z = Math.floor(
      //     ((particle.position.z + settings.boxDepth / 2) / settings.boxDepth) *
      //       this.image.height
      //   );
      const index = (y * this.image.width + x) * 4;

      const r = imageData[index] / 255;
      const g = imageData[index + 1] / 255;
      const b = imageData[index + 2] / 255;

      this.instancedMesh.setColorAt(i, new THREE.Color(r, g, b));
    }
    this.instancedMesh.instanceColor.needsUpdate = true;
  }

  // Function to update the position of the particles based on the forces acting on them
  updateParticles(particles, timeStep) {
    const { settings, instancedMesh } = this;

    for (let i = 0; i < particles.length; i++) {
      const acceleration = particles[i].forces
        .clone()
        .divideScalar(particles[i].density);
      particles[i].velocity.add(acceleration.multiplyScalar(timeStep));
      particles[i].position.add(
        particles[i].velocity.clone().multiplyScalar(timeStep)
      );

      // If InstancedMesh is enabled, we have computed new positions for the particles, now we need to update the InstancedMesh Matrix with the new positions using a dummy object to simulate the wanted matrix transformation
      const dummy = new THREE.Object3D(); // Create a dummy 3D object
      dummy.position.copy(particles[i].position); // Set the position of the dummy object to the particle position

      dummy.updateMatrix(); // Update the transformation matrix of the dummy object

      // todo
      if (settings.sizeScale) {
        const scale = particles[i].density * 0.1;
        const scaleV3 = new THREE.Vector3(scale, scale, scale);
        dummy.matrix.scale(scaleV3);
      }

      instancedMesh.setMatrixAt(particles[i].index, dummy.matrix); // Set the matrix of the particle in the InstancedMesh to the dummy matrix to have the new transformation matrix

      // Check for collisions with the simulation boundary checking the position of the particles with respect to the box walls and reflecting the particles with a restitution factor if they collide with the walls
      if (
        particles[i].position.x < settings.boxWidth / -2 ||
        particles[i].position.x > settings.boxWidth / 2
      ) {
        particles[i].velocity.x *= -1 * settings.BoxRestitution;
        particles[i].position.x = Math.max(
          Math.min(particles[i].position.x, settings.boxWidth / 2),
          settings.boxWidth / -2
        );
      }
      if (
        particles[i].position.y < settings.boxHeight / -2 ||
        particles[i].position.y > settings.boxHeight / 2
      ) {
        particles[i].velocity.y *= -1 * settings.BoxRestitution;
        particles[i].position.y = Math.max(
          Math.min(particles[i].position.y, settings.boxHeight / 2),
          settings.boxHeight / -2
        );
      }
      if (
        particles[i].position.z < settings.boxDepth / -2 ||
        particles[i].position.z > settings.boxDepth / 2
      ) {
        particles[i].velocity.z *= -1 * settings.BoxRestitution;
        particles[i].position.z = Math.max(
          Math.min(particles[i].position.z, settings.boxDepth / 2),
          settings.boxDepth / -2
        );
      }
    }
  }

  animate() {
    const {
      settings,
      stats,
      renderer,
      camera,
      scene,
      particles,
      instancedMesh,
    } = this;

    // Update the InstancedMesh matrix. Based on the user interaction with the GUI
    instancedMesh.instanceMatrix.needsUpdate = true;

    requestAnimationFrame(this.animate.bind(this));

    // Calculate the density, pressure and forces acting on the particles with or without grid optimization
    if (settings.useGridOptimization) {
      calculateDensityAndPressureOptimized(
        particles,
        settings.smoothingLength,
        settings.referenceDensity,
        settings.gasConstant
      );
      calculateForcesOptimized(
        particles,
        settings.smoothingLength,
        settings.referenceDensity,
        settings.gravity
      );
    } else {
      calculateDensityAndPressure(
        particles,
        settings.smoothingLength,
        settings.referenceDensity,
        settings.gasConstant
      );
      calculateForces(
        particles,
        settings.smoothingLength,
        settings.referenceDensity,
        settings.gravity
      );
    }

    // Update the position of the particles based on the forces acting on them
    this.updateParticles(particles, settings.timeStep);

    stats.update();
    renderer.render(scene, camera);
  }

  play = () => {
    this.settings.timeStep = this.settings.timeStep ? 0 : 0.15;
  };

  onResize() {
    const { camera, renderer } = this;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

export default SPH;
