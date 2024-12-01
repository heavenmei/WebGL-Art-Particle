export const TEXTURE_WIDTH = 128;
export const TEXTURE_HEIGHT = 128;
export const AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;
export const BOX = [20, 20, 10];
export const BASE_LIFETIME = 1.0;

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
