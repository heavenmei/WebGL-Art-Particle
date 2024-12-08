precision highp float;

uniform sampler2D u_particleTexture;
uniform sampler2D u_particleDefaultTexture;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;

const float NOISE_POSITION_SCALE = 0.1;
const float NOISE_TIME_SCALE = 0.001;
const float NOISE_SCALE = 0.025;
const float PERSISTENCE = 0.1;
const float DIE_SPEED = 0.04;

#pragma glslify: curl = require(../../helpers/curl.glsl)

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
