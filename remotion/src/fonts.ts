import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";

export const { fontFamily: montserrat } = loadMontserrat("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

export const { fontFamily: cairo } = loadCairo("normal", {
  weights: ["400", "700", "900"],
  subsets: ["arabic", "latin"],
});
