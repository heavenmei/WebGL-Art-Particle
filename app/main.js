"use strict";
import dat from "dat.gui";

import Test from "./test";
import Curl from "./curl";
import Fluid from "./fluid";
import SPH from "./sph";
import Art from "./art";

import artImage from "../assets/images/art.jpg";

const TYPE = ["Fluid", "Curl", "Art", "Test", "SPH"];
const settings = {
  type: localStorage.getItem("WEBGL_TYPE") ?? "Curl",
};

const image = new Image();
image.src = artImage;
image.onload = () => changeTypeCallback(settings.type);
document.getElementById("images").src = artImage;

const video = document.getElementById("myVideo");
// video.onplay = () => changeTypeCallback(settings.type);

const changeTypeCallback = (newValue) => {
  if (localStorage.getItem("WEBGL_TYPE") != newValue) {
    localStorage.setItem("WEBGL_TYPE", newValue);
    window.location.reload();
  }

  const gui = new dat.GUI({ autoPlace: false });
  gui.domElement.id = "gui";
  document.body.prepend(gui.domElement);
  const changeType = gui
    .add(settings, "type", TYPE)
    .name("Select Scene")
    .listen();
  changeType.onChange(changeTypeCallback);

  switch (settings.type) {
    case "Fluid":
      new Fluid(gui, image);
      break;
    case "Curl":
      new Curl(gui, image);
      break;
    case "Art":
      new Art(gui, image, video);
      break;
    case "Test":
      new Test(gui);
      break;
    case "SPH":
      new SPH(gui, image);
      break;
  }
};
