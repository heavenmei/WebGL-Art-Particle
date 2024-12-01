varying float qnoise;

uniform bool redhell;

void main() {
    float r, g, b;

    if(!redhell == true) {
        r = cos(qnoise + 0.5);
        g = cos(qnoise - 0.5);
        b = 0.0;
    } else {
        r = cos(qnoise + 0.5);
        g = cos(qnoise - 0.5);
        b = abs(qnoise);
    }
    gl_FragColor = vec4(66., 157., 105., 255.0) / 255.;
}