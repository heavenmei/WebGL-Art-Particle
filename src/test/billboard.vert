precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

uniform sampler2D map;
uniform sampler2D u_positionsTexture;

attribute vec3 position;
attribute vec2 uv;
attribute vec4 translate;
attribute vec2 textureCoordinates;

varying vec2 vUv;
varying vec3 v_Pos;

void main() {
    vUv = uv;

    // change size
    vec3 trTime = vec3(translate.x + time, translate.y + time, translate.z + time);
    float scale = sin(trTime.x * 2.1) + sin(trTime.y * 3.2) + sin(trTime.z * 4.3);
    scale = scale * 1.0;

    vec4 curPosition = texture2D(u_positionsTexture, textureCoordinates);

    v_Pos = translate.xyz;
    vec3 newPosition = translate.xyz;
    // vec3 newPosition = curPosition.xyz;
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);

    gl_Position = projectionMatrix * vec4(mvPosition.xyz + position, 1.0);

}