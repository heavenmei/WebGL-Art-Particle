precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_renderingTexture;
uniform sampler2D u_occlusionTexture;
uniform sampler2D u_colorSphereTexture;
uniform sampler2D u_shadowDepthTexture;

uniform vec2 u_resolution;
uniform float u_fov;

uniform mat4 u_inverseViewMatrix;

uniform vec2 u_shadowResolution;
uniform mat4 u_lightProjectionViewMatrix;

float linearstep(float left, float right, float x) {
    return clamp((x - left) / (right - left), 0.0, 1.0);
}

// HSV（色相、饱和度、明度）转 RGB
vec3 hsvToRGB(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 RGBTohsv(vec3 c) {
    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float delta = maxC - minC;

    float h = 0.0;
    if(delta != 0.0) {
        if(maxC == c.r) {
            h = mod((c.g - c.b) / delta, 6.0);
        } else if(maxC == c.g) {
            h = (c.b - c.r) / delta + 2.0;
        } else {
            h = (c.r - c.g) / delta + 4.0;
        }
        h /= 6.0;
        if(h < 0.0)
            h += 1.0;
    }

    float s = (maxC == 0.0) ? 0.0 : delta / maxC;
    float v = maxC;

    return vec3(h, s, v);
}

void main() {
    vec4 colorData = texture2D(u_colorSphereTexture, v_coordinates);

    vec4 data = texture2D(u_renderingTexture, v_coordinates);
    // 获取环境遮蔽因子
    float occlusion = texture2D(u_occlusionTexture, v_coordinates).r;

    vec3 viewSpaceNormal = vec3(data.x, data.y, sqrt(1.0 - data.x * data.x - data.y * data.y));

    float viewSpaceZ = data.a;
    vec3 viewRay = vec3((v_coordinates.x * 2.0 - 1.0) * tan(u_fov / 2.0) * u_resolution.x / u_resolution.y, (v_coordinates.y * 2.0 - 1.0) * tan(u_fov / 2.0), -1.0);

    vec3 viewSpacePosition = viewRay * -viewSpaceZ;
    vec3 worldSpacePosition = vec3(u_inverseViewMatrix * vec4(viewSpacePosition, 1.0));

    vec4 lightSpacePosition = u_lightProjectionViewMatrix * vec4(worldSpacePosition, 1.0);
    lightSpacePosition /= lightSpacePosition.w;
    lightSpacePosition *= 0.5;
    lightSpacePosition += 0.5;
    vec2 lightSpaceCoordinates = lightSpacePosition.xy;

    float shadow = 1.0;
    const int PCF_WIDTH = 2;
    const float PCF_NORMALIZATION = float(PCF_WIDTH * 2 + 1) * float(PCF_WIDTH * 2 + 1);

    for(int xOffset = -PCF_WIDTH; xOffset <= PCF_WIDTH; ++xOffset) {
        for(int yOffset = -PCF_WIDTH; yOffset <= PCF_WIDTH; ++yOffset) {
            float shadowSample = texture2D(u_shadowDepthTexture, lightSpaceCoordinates + 5.0 * vec2(float(xOffset), float(yOffset)) / u_shadowResolution).r;
            if(lightSpacePosition.z > shadowSample + 0.001)
                shadow -= 1.0 / PCF_NORMALIZATION;
        }
    }
    // * A(p) = 1 - occlusion/ N
    float ambient = 1.0 - occlusion * 0.3;
    float direct = 1.0 - (1.0 - shadow) * 0.2;

    float speed = data.b;
    // vec3 color = hsvToRGB(vec3(max(0.6 - speed * 0.0025, 0.52), 0.75, 1.0));

    vec3 hsv = RGBTohsv(colorData.xyz);
    // 根据速度调整色相
    hsv.x = hsv.x + speed * 0.002;
    // 根据速度调整亮度
    hsv.z = clamp(hsv.z + speed * 0.002, 0.0, 1.0);
    vec3 color = hsvToRGB(hsv);

    // vec3 color = colorData.xyz;
    color *= ambient * direct;

    if(speed >= 0.0) {
        gl_FragColor = vec4(color, 1.0);
    } else {
        vec3 backgroundColor = vec3(1.0) - length(v_coordinates * 2.0 - 1.0) * 0.1;
        gl_FragColor = vec4(backgroundColor, 1.0);
    }

}
