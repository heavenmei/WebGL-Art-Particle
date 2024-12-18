Fluid simulation is a GPU implementation of the PIC/FLIP method (with various additions). Particle rendering uses spherical ambient occlusion volumes.

## Start

```bash
npm install
npm run start
```

# Smoothed Particle Hydrodynamics Implementation in Three.js

## What is Smoothed Particle Hydrodynamics (SPH)?

Smoothed Particle Hydrodynamics (SPH) is a computational method used to simulate the dynamics of fluids and gasses. It is a mesh-free, Lagrangian method which tracks fluid particles as they move through space and time, with each particle containing properties such as mass, position, and velocity. A distinctive feature of SPH is its use of a smoothing kernel, which estimates field values like density and pressure across the fluid, enhancing the method’s stability and accuracy.

## What is a smoothing kernel?

The smoothing kernel is a mathematical function that determines how much influence a particle has on its neighboring points in space. Its purpose is to smooth out the properties of particles over a defined area, ensuring that the physical quantities are not calculated just at discrete points (where particles are located) but rather across a continuum space.

### Kernel Function

As a kernel function, we use the Cubic Spline Kernel introduced in the late 1970s for SPH. This kernel became a standard tool for simulating fluid dynamics due to its smooth and compact shape, which makes it ideal for approximating fluid behavior.

### Density

The density of a particle is computed by summing the contributions of all neighboring particles' masses within a certain radius, known as the smoothing length. The mass of each neighbor is weighted by the kernel function W.

### Pressure

Once the density is computed, the pressure of each particle is calculated using the Tait equation. The purpose of this equation is to provide a relationship between pressure and density that ensures the fluid behaves realistically under compression and expansion. It helps in maintaining incompressibility to some extent, which is a desirable property for simulating liquids.

### Pressure Force

The pressure force calculates the force exerted on a particle due to the pressure difference between it and its neighbors. The negative sign indicates that the force acts to reduce pressure differences, promoting stability in the fluid system. The gradient provides the direction in which the pressure force acts.

### Viscosity Force

The viscosity force represents the force exerted on a particle due to the velocity differences between it and its neighboring particles. This force helps simulate the internal friction within the fluid, ensuring that particles move in a smooth, coherent manner, which is crucial for realistic fluid behavior.

### Gravity Force

The gravity force is applied uniformly to all particles in the simulation. It is calculated by multiplying the mass of each particle by the gravitational acceleration. This force ensures that all particles experience a constant downward pull, simulating the effect of gravity (if activated).

### Grid-based updates

To optimize the computation of forces, a grid optimization has been implemented, which enhances the performance and scalability of the fluid simulation. The optimization involves spatially partitioning the simulation space into a grid, where each cell contains a list of particles within its boundaries. The cell size is determined by the smoothing length, ensuring particles within the same or neighboring cells can be considered for force calculations. During each simulation step, particles are assigned to grid cells based on their positions. For density and pressure calculations, each particle's density is computed by summing contributions from particles in its cell and adjacent cells using the SPH kernel function, and pressure is then calculated based on the density. Similarly, for force calculations, particles interact only with those in their cell and neighboring cells, reducing the original O(n^2) computational complexity.

### Instanced Mesh

Instanced Mesh optimization is a crucial feature in this fluid simulation, using the Three.js's InstancedMesh class to efficiently render a large number of particles. This approach significantly reduces the computational load on the GPU by minimizing the number of draw calls required, thus enhancing the overall performances. All particles share the same geometry and material, defined once and reused across instances. This avoids the overhead of creating and managing individual mesh objects for each particle.
