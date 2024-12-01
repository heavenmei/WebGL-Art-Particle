varying vec2 vUv;
varying float noise;
varying float qnoise;
varying float displacement;

uniform float time;
uniform float pointscale;
uniform float decay;
uniform float complex;
uniform float waves;
uniform float eqcolor;
uniform bool fragment;

#pragma glslify: pnoise = require(../shader/utils/noise.glsl)

// Turbulence By Jaume Sanchez => https://codepen.io/spite/
float turbulence(vec3 p) {
    float t = -0.1;
    for(float f = 1.0; f <= 3.0; f++) {
        float power = pow(2.0, f);
        t += abs(pnoise(vec3(power * p), vec3(10.0, 10.0, 10.0)) / power);
    }
    return t;
}

void main() {

    vUv = uv;

    noise = (1.0 * -waves) * turbulence(decay * abs(normal + time));
    qnoise = (2.0 * -eqcolor) * turbulence(decay * abs(normal + time));
    float b = pnoise(complex * (position) + vec3(1.0 * time), vec3(100.0));

    if(fragment == true) {
        displacement = -sin(noise) + normalize(b * 0.5);
    } else {
        displacement = -sin(noise) + cos(b * 0.5);
    }

    vec3 newPosition = (position) + (normal * displacement);
    gl_Position = (projectionMatrix * modelViewMatrix) * vec4(newPosition, 1.0);
    gl_PointSize = (pointscale);
   //gl_ClipDistance[0];

}