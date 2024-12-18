precision highp float;

uniform vec4 u_color;
uniform vec3 u_reverseLightDirection;

varying vec3 v_normal;

void main() {
    vec3 normal = normalize(v_normal);
    float light = dot(normal, u_reverseLightDirection);

    gl_FragColor = u_color;
    gl_FragColor.rgb *= light;
}
