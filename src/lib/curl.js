import noise from "./noise.js";

export function computeCurl(x, y, z) {
  var eps = 1e-4;
  var curl = [0, 0, 0];

  if (!oldMethod) {
    //Find rate of change in X plane
    var n1 = noise.simplex3(x + eps, y, z);
    var n2 = noise.simplex3(x - eps, y, z);
    //Average to find approximate derivative
    var a = (n1 - n2) / (2 * eps);

    //Find rate of change in Y plane
    n1 = noise.simplex3(x, y + eps, z);
    n2 = noise.simplex3(x, y - eps, z);
    //Average to find approximate derivative
    var b = (n1 - n2) / (2 * eps);

    //Find rate of change in Z plane
    n1 = noise.simplex3(x, y, z + eps);
    n2 = noise.simplex3(x, y, z - eps);
    //Average to find approximate derivative
    var c = (n1 - n2) / (2 * eps);

    var noiseGrad0 = [a, b, c];

    // Offset position for second noise read
    x += 10.5;
    y += 10.5;
    z += 10.5;

    //Find rate of change in X
    n1 = noise.simplex3(x + eps, y, z);
    n2 = noise.simplex3(x - eps, y, z);
    //Average to find approximate derivative
    a = (n1 - n2) / (2 * eps);

    //Find rate of change in Y
    n1 = noise.simplex3(x, y + eps, z);
    n2 = noise.simplex3(x, y - eps, z);
    //Average to find approximate derivative
    b = (n1 - n2) / (2 * eps);

    //Find rate of change in Z
    n1 = noise.simplex3(x, y, z + eps);
    n2 = noise.simplex3(x, y, z - eps);
    //Average to find approximate derivative
    c = (n1 - n2) / (2 * eps);

    var noiseGrad1 = [a, b, c];

    noiseGrad1 = normalize(noiseGrad1);
    noiseGrad1 = normalize(noiseGrad1);
    curl = cross(noiseGrad0, noiseGrad1);
  } else {
    //Find rate of change in X
    var n1 = noise3D(x + eps, y, z);
    var n2 = noise3D(x - eps, y, z);
    var dx = [n1[0] - n2[0], n1[1] - n2[1], n1[2] - n2[2]];

    //Find rate of change in Y
    n1 = noise3D(x, y + eps, z);
    n2 = noise3D(x, y - eps, z);
    var dy = [n1[0] - n2[0], n1[1] - n2[1], n1[2] - n2[2]];

    //Find rate of change in Z
    n1 = noise3D(x, y, z + eps);
    n2 = noise3D(x, y, z - eps);
    var dz = [n1[0] - n2[0], n1[1] - n2[1], n1[2] - n2[2]];

    curl[0] = (dy[2] - dz[1]) / (2.0 * eps);
    curl[1] = (dz[0] - dx[2]) / (2.0 * eps);
    curl[2] = (dx[1] - dy[0]) / (2.0 * eps);
  }
  return normalize(curl);
}
