attribute vec3 a_position;
attribute vec4 a_color;

uniform float u_time;

uniform vec3 u_translation;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

varying vec4 v_color;

void main() {
  // gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position + u_translation, 1.0);

  // Create a rotation matrix around the y-axis
  float angle = u_time;
  mat4 rotationMatrixX = mat4(1.0, 0.0, 0.0, 0.0, 0.0, cos(angle), -sin(angle), 0.0, 0.0, sin(angle), cos(angle), 0.0, 0.0, 0.0, 0.0, 1.0);

  mat4 rotationMatrixY = mat4(cos(angle), 0.0, sin(angle), 0.0, 0.0, 1.0, 0.0, 0.0, -sin(angle), 0.0, cos(angle), 0.0, 0.0, 0.0, 0.0, 1.0);

  // mat4 rotationMatrix = rotationMatrixY * rotationMatrixX;
  vec4 rotatedPosition = vec4(a_position, 1.0);

  gl_Position = u_projectionMatrix * u_viewMatrix * vec4(rotatedPosition.xyz + u_translation, 1.0);

  v_color = a_color;
}