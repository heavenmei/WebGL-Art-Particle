attribute vec3 a_position;
attribute vec4 a_color;
attribute vec3 a_offset;

uniform vec3 u_translation;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

varying vec4 v_color;

void main() {

  gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position + a_offset + u_translation, 1.0);

  v_color = a_color;
}