precision highp float;

uniform sampler2D u_image;
uniform vec2 u_textureSize;

uniform vec3 u_reverseLightDirection;

varying vec3 v_viewSpacePosition;
varying vec3 v_viewSpaceNormal;
varying float v_speed;

varying vec3 sphereInitPosition;
varying vec3 spherePosition;

void main() {
    // gl_FragColor = vec4(v_viewSpaceNormal.x, v_viewSpaceNormal.y, v_speed, v_viewSpacePosition.z);

    //* 计算1像素对应的纹理坐标
    vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
    vec2 pixelPos = vec2(sphereInitPosition.x * onePixel.y, sphereInitPosition.z * onePixel.x);
    // vec2 pixelPos = vec2(spherePosition.x * onePixel.y, spherePosition.z * onePixel.x);

    vec3 pixelColor = texture2D(u_image, pixelPos).rgb;

    gl_FragColor = vec4(pixelColor, 1.0);

    // vec3 normal = normalize(v_viewSpaceNormal);
    // float light = dot(normal, u_reverseLightDirection) * 1.1;
    // gl_FragColor.rgb *= light;
}
