vec4 texture3D(sampler2D texture, vec3 coordinates, vec3 resolution) {
    vec3 fullCoordinates = coordinates * resolution; //in [(0, 0, 0), (resolution.x, resolution.y, resolutionz)] 

    fullCoordinates = clamp(fullCoordinates, vec3(0.5), vec3(resolution - 0.5));

    //belowZIndex and aboveZIndex don't have the 0.5 offset
    float belowZIndex = floor(fullCoordinates.z - 0.5);
    float aboveZIndex = belowZIndex + 1.0; 

    //we interpolate the z
    float fraction = fract(fullCoordinates.z - 0.5);

    vec2 belowCoordinates = vec2(belowZIndex * resolution.x + fullCoordinates.x, fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

    vec2 aboveCoordinates = vec2(aboveZIndex * resolution.x + fullCoordinates.x, fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

    return mix(texture2D(texture, belowCoordinates), texture2D(texture, aboveCoordinates), fraction);
}

#pragma glslify: export(texture3D)
