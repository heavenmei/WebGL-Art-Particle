import * as THREE from "three";

// Constants for the SPH kernel functions to avoid recalculating them every frame
const kernelCoefficients = {
  cubic: 315 / (64 * Math.PI),
  gradient: -45 / Math.PI,
};

// Function to calculate the cubic spline kernel function for given distance and smoothing length
function kernel(r, h) {
  const q = r / h;
  if (q < 1) {
    return (
      (kernelCoefficients.cubic * Math.pow(h * h - r * r, 3)) / Math.pow(h, 9)
    );
  }
  return 0;
}

// Function to calculate the gradient of the cubic spline kernel function for given distance and smoothing length
function gradientKernel(r, h) {
  const q = r / h;
  if (q < 1) {
    return (kernelCoefficients.gradient * Math.pow(h - r, 2)) / Math.pow(h, 6);
  }
  return 0;
}

// Function to calculate the density and pressure of the particles
export function calculateDensityAndPressure(particles, h, rho0, k) {
  for (let i = 0; i < particles.length; i++) {
    let density = 0;
    for (let j = 0; j < particles.length; j++) {
      const r = particles[i].position.distanceTo(particles[j].position);
      if (r < h) {
        // Only consider neighbors within smoothing length
        density += particles[j].mass * kernel(r, h);
      }
    }
    particles[i].density = density;
    particles[i].pressure = k * (particles[i].density - rho0);
  }
}

// Function to calculate the forces acting on the particles using the naive approach
export function calculateForces(particles, h, mu, g) {
  for (let i = 0; i < particles.length; i++) {
    // Initialize the forces acting on the particle
    let pressureForce = new THREE.Vector3(0, 0, 0);
    let viscosityForce = new THREE.Vector3(0, 0, 0);
    const gravityForce = new THREE.Vector3(0, -g * particles[i].mass, 0); // Gravity is constant

    // Reset forces
    particles[i].forces.set(0, 0, 0);

    // Loop over all the particles to calculate the forces acting on the current particle
    for (let j = 0; j < particles.length; j++) {
      if (i === j) continue; // Skip the particle itself

      // Calculate r as the distance between the two particles
      const r = particles[i].position.distanceTo(particles[j].position);

      if (r < h) {
        // Only consider neighbors within smoothing length
        // Compute the gradient of the kernel function
        const gradient = gradientKernel(r, h);

        // Compute the pressure
        const pressure =
          (particles[i].pressure + particles[j].pressure) /
          (2 * particles[j].density);
        const direction = new THREE.Vector3()
          .subVectors(particles[i].position, particles[j].position)
          .normalize();
        pressureForce.add(
          direction.multiplyScalar(-particles[j].mass * pressure * gradient)
        );

        // Compute the viscosity
        const viscosity = mu * (particles[j].mass / particles[j].density);
        const relativeVelocity = new THREE.Vector3().subVectors(
          particles[j].velocity,
          particles[i].velocity
        );
        viscosityForce.add(
          relativeVelocity.multiplyScalar(-viscosity * gradient)
        );
      }
    }

    // Update the forces acting on the particle
    particles[i].forces.add(pressureForce);
    particles[i].forces.add(viscosityForce);
    particles[i].forces.add(gravityForce);
  }
}

// Function to calculate the forces acting on the particles using a grid optimization
export function calculateDensityAndPressureOptimized(particles, h, rho0, k) {
  const cellSize = h; // Cell size is equal to the smoothing length
  const cells = new Map(); // Map to store the i

  // Put every particle in a cell, so that we can easily find its neighbors
  for (let i = 0; i < particles.length; i++) {
    // Compute the cell x, y, z where the particle is going to be located
    const cellX = Math.floor(particles[i].position.x / cellSize);
    const cellY = Math.floor(particles[i].position.y / cellSize);
    const cellZ = Math.floor(particles[i].position.z / cellSize);
    const cellId = `${cellX}-${cellY}-${cellZ}`; // Create a unique cell id to store the particles

    // If the cell does not exist, create it
    if (!cells.has(cellId)) {
      cells.set(cellId, []);
    }

    // Add the particle index to the cell
    cells.get(cellId).push(i);
  }

  for (let i = 0; i < particles.length; i++) {
    let density = 0;
    // find the cell where the particle is located
    const cellX = Math.floor(particles[i].position.x / cellSize);
    const cellY = Math.floor(particles[i].position.y / cellSize);
    const cellZ = Math.floor(particles[i].position.z / cellSize);

    // Loop over the neighboring cells to find the neighbors of the particle
    for (let x = cellX - 1; x <= cellX + 1; x++) {
      for (let y = cellY - 1; y <= cellY + 1; y++) {
        for (let z = cellZ - 1; z <= cellZ + 1; z++) {
          // Compute the cell id
          const cellId = `${x}-${y}-${z}`;

          // Check if the cell exists in the map
          if (cells.has(cellId)) {
            // Loop over the particles in the cell to calculate the density
            for (const j of cells.get(cellId)) {
              // Compute the distance between the particles
              const r = particles[i].position.distanceTo(particles[j].position);

              if (r < h) {
                // Only consider neighbors within smoothing length
                density += particles[j].mass * kernel(r, h);
              }
            }
          }
        }
      }
    }
    // Update the density and pressure of the particle
    particles[i].density = density;
    particles[i].pressure = k * (particles[i].density - rho0);
  }
}

// Function to calculate the forces acting on the particles using a grid optimization
export function calculateForcesOptimized(particles, h, mu, g) {
  const cellSize = h;
  const cells = new Map();
  for (let i = 0; i < particles.length; i++) {
    // Compute the cell x, y, z where the particle is going to be located
    const cellX = Math.floor(particles[i].position.x / cellSize);
    const cellY = Math.floor(particles[i].position.y / cellSize);
    const cellZ = Math.floor(particles[i].position.z / cellSize);

    // Create a unique cell id to store the particles
    const cellId = `${cellX}-${cellY}-${cellZ}`;

    // If the cell does not exist, create it
    if (!cells.has(cellId)) {
      cells.set(cellId, []);
    }
    // Add the particle index to the cell
    cells.get(cellId).push(i);
  }
  for (let i = 0; i < particles.length; i++) {
    // Initialize the forces acting on the particle
    let pressureForce = new THREE.Vector3(0, 0, 0);
    let viscosityForce = new THREE.Vector3(0, 0, 0);
    const gravityForce = new THREE.Vector3(0, -g * particles[i].mass, 0);
    particles[i].forces.set(0, 0, 0);

    // Find the cell x, y, z where the particle is located
    const cellX = Math.floor(particles[i].position.x / cellSize);
    const cellY = Math.floor(particles[i].position.y / cellSize);
    const cellZ = Math.floor(particles[i].position.z / cellSize);

    // Loop over the neighboring cells to find the neighbors of the particle
    for (let x = cellX - 1; x <= cellX + 1; x++) {
      for (let y = cellY - 1; y <= cellY + 1; y++) {
        for (let z = cellZ - 1; z <= cellZ + 1; z++) {
          // Compute the cell id
          const cellId = `${x}-${y}-${z}`;
          if (cells.has(cellId)) {
            for (const j of cells.get(cellId)) {
              // Compute the distance between the particles
              const r = particles[i].position.distanceTo(particles[j].position);

              if (r < h) {
                // Compute the gradient of the kernel function to find the forces direction
                const gradient = gradientKernel(r, h);

                // Compute the pressure
                const pressure =
                  (particles[i].pressure + particles[j].pressure) /
                  (2 * particles[j].density);
                const direction = new THREE.Vector3()
                  .subVectors(particles[i].position, particles[j].position)
                  .normalize();
                pressureForce.add(
                  direction.multiplyScalar(
                    -particles[j].mass * pressure * gradient
                  )
                );

                // Compute the viscosity
                const viscosity =
                  mu *
                  (particles[j].mass / Math.max(particles[j].density, 0.0001));
                const relativeVelocity = new THREE.Vector3().subVectors(
                  particles[j].velocity,
                  particles[i].velocity
                );
                viscosityForce.add(
                  relativeVelocity.multiplyScalar(-viscosity * gradient)
                );
              }
            }
          }
        }
      }
    }

    // Update the forces acting on the particle
    particles[i].forces.add(pressureForce);
    particles[i].forces.add(viscosityForce);
    particles[i].forces.add(gravityForce);
  }
}
