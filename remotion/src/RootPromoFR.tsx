import { Composition } from "remotion";
import { PromoFR } from "./PromoFR";

export const RemotionRootPromoFR = () => (
  <Composition
    id="promo-fr"
    component={PromoFR}
    durationInFrames={900}
    fps={30}
    width={1920}
    height={1080}
  />
);
