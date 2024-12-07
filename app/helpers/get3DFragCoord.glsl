vec3 get3DFragCoord(vec3 resolution) {
    return vec3(mod(gl_FragCoord.x, resolution.x), gl_FragCoord.y, floor(gl_FragCoord.x / resolution.x) + 0.5);
}

#pragma glslify: export(get3DFragCoord)
