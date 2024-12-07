"use strict";
import dat from "dat.gui";

import Sphere from "./sphere";
import Curl from "./curl";
import Fluid from "./fluid";

const TYPE = ["Fluid", "Curl", "Test"];
const settings = {
  type: localStorage.getItem("WEBGL_TYPE") ?? "Curl",
};

var imageDom = document.getElementById("image-target");
let image = new Image();
image.src = imageDom.src;
image.onload = main;

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
    case "Test":
      new Sphere();
      break;
  }
};

function main() {
  changeTypeCallback(settings.type);
}
