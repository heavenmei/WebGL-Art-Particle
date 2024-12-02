precision highp float;

uniform sampler2D map;
uniform sampler2D u_image;
uniform vec2 u_imageSize;
uniform vec2 u_box2img;

varying vec2 vUv;
varying vec3 vDefaultPosition;

void main() {

    //* 计算1像素对应的纹理坐标
    vec2 onePixel = vec2(1.0, 1.0) / u_imageSize;
    // vec2 pixelPos = vec2(vDefaultPosition.y * onePixel.y, vDefaultPosition.x * onePixel.x);
    vec2 pixelPos = vDefaultPosition.xy * u_box2img;
    vec3 pixelColor = texture2D(u_image, pixelPos).rgb;

    vec4 diffuseColor = texture2D(map, vUv);

    // vec3 color = diffuseColor.xyz * pixelColor;
    vec3 color = pixelColor;

    gl_FragColor = vec4(color, diffuseColor.w);

    if(diffuseColor.w < 0.5)
        discard;
}