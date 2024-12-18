precision highp float;

attribute vec3 a_position;
attribute vec3 a_normal;

uniform vec3 u_translation;
uniform vec3 u_scale;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

varying vec3 v_normal;

void main() {
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position * u_scale + u_translation, 1.0);

    v_normal = mat3(u_viewMatrix) * a_normal;
}
