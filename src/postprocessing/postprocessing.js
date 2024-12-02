import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";

class PostProcessing {
  constructor(renderer, scene, camera, width, height) {
    this.composer = new EffectComposer(renderer);

    const gtaoPass = new GTAOPass(scene, camera, width, height);
    gtaoPass.output = GTAOPass.OUTPUT.Off;

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.ssaoPass = new SSAOPass(scene, camera);
    this.composer.addPass(this.ssaoPass);

    this.outputPass = new OutputPass();
    // this.composer.addPass(this.outputPass);
  }

  resize(width, height) {
    this.composer.resize(width, height);
  }

  render(dt, newTime) {
    this.composer.render();
  }
}

export default PostProcessing;
