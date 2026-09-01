import OpenConsent, { autoInit } from './index.js';

globalThis.OpenConsent = OpenConsent;

const ready = autoInit();
if (ready) globalThis.OpenConsent.ready = ready;

export default OpenConsent;
