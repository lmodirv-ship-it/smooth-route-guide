import { Composition } from "remotion";
import { Scene1Identity } from "./scenes/Scene1Identity";
import { Scene2Tech } from "./scenes/Scene2Tech";
import { Scene3Drivers } from "./scenes/Scene3Drivers";
import { Scene4Global } from "./scenes/Scene4Global";

export const RemotionRoot = () => (
  <>
    <Composition id="scene1-identity" component={Scene1Identity} durationInFrames={900} fps={30} width={1920} height={1080} />
    <Composition id="scene2-tech" component={Scene2Tech} durationInFrames={900} fps={30} width={1920} height={1080} />
    <Composition id="scene3-drivers" component={Scene3Drivers} durationInFrames={900} fps={30} width={1920} height={1080} />
    <Composition id="scene4-global" component={Scene4Global} durationInFrames={900} fps={30} width={1920} height={1080} />
  </>
);
