//advects particle positions with second order runge kutta
precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_positionsTexture;
uniform sampler2D u_randomsTexture;
uniform sampler2D u_particleTextureOriginal;

uniform sampler2D u_velocityGrid;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

uniform float u_timeStep;
uniform float u_time;
uniform float u_curlScale;
uniform float u_flipScale;

uniform float u_frameNumber;

uniform vec2 u_particlesResolution;

const float NOISE_POSITION_SCALE = 0.1;
const float NOISE_TIME_SCALE = 0.01;
const float PERSISTENCE = 0.2;
const float DIE_SPEED = 0.04;

#pragma glslify: texture3D = require(../../helpers/texture3D.glsl)
#pragma glslify: curl = require(../../helpers/curl.glsl)

float sampleXVelocity(vec3 position) {
    vec3 cellIndex = vec3(position.x, position.y - 0.5, position.z - 0.5);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).x;
}

float sampleYVelocity(vec3 position) {
    vec3 cellIndex = vec3(position.x - 0.5, position.y, position.z - 0.5);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).y;
}

float sampleZVelocity(vec3 position) {
    vec3 cellIndex = vec3(position.x - 0.5, position.y - 0.5, position.z);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).z;
}

vec3 sampleVelocity(vec3 position) {
    vec3 gridPosition = (position / u_gridSize) * u_gridResolution;
    return vec3(sampleXVelocity(gridPosition), sampleYVelocity(gridPosition), sampleZVelocity(gridPosition));
}

void main() {
    vec4 v_position = texture2D(u_positionsTexture, v_coordinates);
    vec3 position = v_position.rgb;

    vec3 randomDirection = texture2D(u_randomsTexture, fract(v_coordinates + u_frameNumber / u_particlesResolution)).rgb;

    vec3 velocity = sampleVelocity(position);
    vec3 halfwayPosition = position + velocity * u_timeStep * 0.5;
    vec3 halfwayVelocity = sampleVelocity(halfwayPosition);

    vec3 step = halfwayVelocity * u_timeStep * u_flipScale;

    // step += 0.05 * randomDirection * length(velocity) * u_timeStep;
    // step = clamp(step, -vec3(1.0), vec3(1.0)); //enforce CFL condition

    // * curl noise
    vec3 noiseVelocity = curl(position * NOISE_POSITION_SCALE, u_time * NOISE_TIME_SCALE, PERSISTENCE);
    vec3 curlPosition = noiseVelocity * u_timeStep * u_curlScale;

    vec3 newPosition = position + step + curlPosition;

    // * 边界限制
    newPosition = clamp(newPosition, vec3(0.01), u_gridSize - 0.01);

    // * 若粒子消亡，重置
    float life = v_position.a - DIE_SPEED;
    if(life < 0.0) {
        vec4 defaultPosition = texture2D(u_particleTextureOriginal, v_coordinates);
        newPosition = defaultPosition.rgb;
        life = defaultPosition.a;
    }

    gl_FragColor = vec4(newPosition, life);
}
