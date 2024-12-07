precision mediump float;

uniform sampler2D u_particles;
uniform sampler2D u_box;

varying vec2 v_coordinates;

void main() {
    vec4 o = texture2D(u_particles, v_coordinates);
    vec4 p = texture2D(u_box, v_coordinates);
    gl_FragColor = o * p;
}
