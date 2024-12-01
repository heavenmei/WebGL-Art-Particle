precision highp float;

attribute vec4 instancePosition; // 实例位置
attribute vec2 a_textureCoordinates;
uniform sampler2D u_positionsDefaultTexture;
uniform sampler2D u_positionsTexture;

varying vec2 vUv;
varying vec3 v_Pos;

void main() {
    vUv = uv;

    vec3 curPosition = texture2D(u_positionsTexture, a_textureCoordinates).rgb;
    v_Pos = curPosition.xyz;

    vec3 spherePosition = position + curPosition;

    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(spherePosition, 1.0);
}
