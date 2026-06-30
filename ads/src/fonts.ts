// Load the Field Notes type family via Remotion's Google Fonts integration so
// renders are deterministic (no FOUT / network race during frame capture).
import { loadFont as loadBricolage } from '@remotion/google-fonts/BricolageGrotesque';
import { loadFont as loadSpline } from '@remotion/google-fonts/SplineSans';
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';

export const bricolage = loadBricolage();
export const spline = loadSpline();
export const caveat = loadCaveat();

export const fontsReady = Promise.all([
  bricolage.waitUntilDone(),
  spline.waitUntilDone(),
  caveat.waitUntilDone(),
]);
