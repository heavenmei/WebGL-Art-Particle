precision highp float;

attribute vec3 a_vertexPosition;
attribute vec3 a_vertexNormal;

attribute vec2 a_textureCoordinates;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

// 初始化位置
uniform sampler2D u_positionsInitTexture;

// 不停地更新的位置纹理
uniform sampler2D u_positionsTexture;
uniform sampler2D u_velocitiesTexture;

uniform float u_sphereRadius;

varying vec3 v_viewSpacePosition;
varying vec3 v_viewSpaceNormal;
varying float v_speed;

varying vec3 sphereInitPosition;
varying vec3 spherePosition;

void main() {
    spherePosition = texture2D(u_positionsTexture, a_textureCoordinates).rgb;
    vec3 position = a_vertexPosition * u_sphereRadius + spherePosition;

    v_viewSpacePosition = vec3(u_viewMatrix * vec4(position, 1.0));
    //this assumes we're not doing any weird stuff in the view matrix
    v_viewSpaceNormal = vec3(u_viewMatrix * vec4(a_vertexNormal, 0.0));

    // gl_Position = u_projectionMatrix * vec4(v_viewSpacePosition, 1.0);

    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(position, 1.0);

    vec3 velocity = texture2D(u_velocitiesTexture, a_textureCoordinates).rgb;
    v_speed = length(velocity);

    // * 记录初始化位置赋值color
    // sphereInitPosition = texture2D(u_positionsInitTexture, a_textureCoordinates).rgb;

}
