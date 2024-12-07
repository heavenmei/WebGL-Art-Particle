vec4 texture3DNearest(sampler2D texture, vec3 coordinates, vec3 resolution) { //clamps the z coordinate
    vec3 fullCoordinates = coordinates * resolution; //in [(0, 0, 0), (resolution.x, resolution.y, resolutionz)] 

    fullCoordinates = clamp(fullCoordinates, vec3(0.5), vec3(resolution - 0.5));

    float zIndex = floor(fullCoordinates.z);

    vec2 textureCoordinates = vec2(zIndex * resolution.x + fullCoordinates.x, fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

    return texture2D(texture, textureCoordinates);
}
#pragma glslify: export(texture3DNearest)