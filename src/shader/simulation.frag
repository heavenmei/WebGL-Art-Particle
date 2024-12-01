precision highp float;

uniform sampler2D u_particleTexture;
uniform sampler2D u_particleDefaultTexture;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;

#pragma glslify: snoise4 = require(./utils/snoise4.glsl)

const int OCTAVES = 3;
const float NOISE_POSITION_SCALE = 0.1;
const float NOISE_TIME_SCALE = 0.001;
const float NOISE_SCALE = 0.025;
const float PERSISTENCE = 0.1;
const float DIE_SPEED = 0.04;

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
        xNoisePotentialDerivatives += snoise4(vec4(p * twoPowI, noiseTime)) * noiseScale;
        yNoisePotentialDerivatives += snoise4(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * noiseScale;
        zNoisePotentialDerivatives += snoise4(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * noiseScale;
    }

    return vec3(zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2], xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0], yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]);
}

void main() {

    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec4 position = texture2D(u_particleTexture, uv);
    vec3 newPosition = position.rgb;
    float life = position.a - DIE_SPEED;

    if(life < 0.0) {
        // 若粒子消亡，重置
        vec4 defaultPosition = texture2D(u_particleDefaultTexture, uv);
        newPosition = defaultPosition.rgb;
        life = defaultPosition.a;
    } else {
        // compute curl
        vec3 noisePosition = newPosition * NOISE_POSITION_SCALE;
        float noiseTime = u_time * NOISE_TIME_SCALE;
        vec3 noiseVelocity = curl(noisePosition, noiseTime, PERSISTENCE);

        newPosition += noiseVelocity * NOISE_SCALE * u_speed;
    }

    gl_FragColor = vec4(newPosition, life);
}
