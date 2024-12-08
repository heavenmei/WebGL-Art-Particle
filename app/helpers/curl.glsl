precision highp float;

#pragma glslify: simplexNoiseDerivatives = require(./noise.glsl)

const int OCTAVES = 3;

vec3 curl(vec3 p, float noiseTime, float persistence) {

    vec4 xNoisePotentialDerivatives = vec4(0.0);
    vec4 yNoisePotentialDerivatives = vec4(0.0);
    vec4 zNoisePotentialDerivatives = vec4(0.0);

    for(int i = 0; i < OCTAVES; ++i) {
        float twoPowI = pow(2.0, float(i));
        float noiseScale = 0.5 * twoPowI * pow(persistence, float(i));

        //fix undefined behaviour
        if(persistence == 0.0 && i == 0) {
            noiseScale = 1.0;
        }
        xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(p * twoPowI, noiseTime)) * noiseScale;
        yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * noiseScale;
        zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * noiseScale;
    }

    return vec3(zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2], xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0], yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]);
}

#pragma glslify: export(curl)