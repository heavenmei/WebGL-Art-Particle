precision highp float;

varying vec3 v_viewSpacePosition;
varying vec3 v_viewSpaceNormal;
varying float v_speed;
varying float v_scaledColor;

void main() {
    gl_FragColor = vec4(v_viewSpaceNormal.x, v_viewSpaceNormal.y, v_scaledColor, v_viewSpacePosition.z);
}
