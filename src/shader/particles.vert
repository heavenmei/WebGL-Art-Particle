precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

uniform sampler2D u_positionsTexture;
uniform sampler2D u_particleDefaultTexture;
attribute vec2 textureCoordinates;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;
varying vec3 vDefaultPosition;

void main() {
    vUv = uv;
    vec4 curPosition = texture2D(u_positionsTexture, textureCoordinates);

    vDefaultPosition = texture2D(u_positionsTexture, textureCoordinates).xyz;

    // change size
    vec3 trTime = vec3(curPosition.x + time, curPosition.y + time, curPosition.z + time);
    float scale = sin(trTime.x * 2.1) + sin(trTime.y * 3.2) + sin(trTime.z * 4.3);
    scale = scale * 1.0;

    vec3 newPosition = curPosition.xyz;
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);

    gl_Position = projectionMatrix * vec4(mvPosition.xyz + position, 1.0);

}