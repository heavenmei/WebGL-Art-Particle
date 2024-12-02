export const TEXTURE_WIDTH = 256;
export const TEXTURE_HEIGHT = 256;
export const AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;
export const BASE_LIFETIME = 10.0;

export const options = {
  perlin: {
    vel: 0.002,
    speed: 0.0005,
    perlins: 0.0001,
    decay: 0.1,
    complex: 0.3,
    waves: 10.0,
    eqcolor: 1.0,
    fragment: true,
    redhell: true,
  },
  spin: {
    sinVel: 0.0,
    ampVel: 80.0,
  },
};

export const BORDER = 0.5;
export const BOX_X = 20,
  BOX_Y = 18,
  BOX_Z = 6;
export const BOX = [BOX_X, BOX_Y, 5];
export const BOX_BORDER = [
  // behind
  {
    pos: [BOX_X / 2, BOX_Y / 2, -BORDER / 2],
    size: [BOX_X + BORDER * 2, BOX_Y + BORDER , BORDER],
  }, // left
  {
    pos: [-BORDER / 2, BOX_Y / 2, BOX_Z / 2],
    size: [BORDER, BOX_Y + BORDER, BOX_Z],
  }, // left
  {
    pos: [BOX_X + BORDER / 2, BOX_Y / 2, BOX_Z / 2],
    size: [BORDER, BOX_Y + BORDER, BOX_Z],
  }, // right
  { pos: [BOX_X / 2, 0, BOX_Z / 2], size: [BOX_X, BORDER, BOX_Z] }, // bottom
  { pos: [BOX_X / 2, BOX_Y, BOX_Z / 2], size: [BOX_X, BORDER, BOX_Z] }, // top
];
