precision highp float;

uniform sampler2D map;
uniform sampler2D u_image;
uniform vec2 u_box2img;

varying vec2 vUv;
varying vec3 v_Pos;

void main() {

    vec2 pixelPos = v_Pos.xy * u_box2img;
    vec3 pixelColor = texture2D(u_image, pixelPos).rgb;

    vec4 diffuseColor = texture2D(map, vUv);

    vec3 color = diffuseColor.xyz * pixelColor;

    gl_FragColor = vec4(color, diffuseColor.w);

    if(diffuseColor.w < 0.5)
        discard;
}