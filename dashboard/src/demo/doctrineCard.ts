export const DOCTRINE_CARD_DEMO_URL = "https://meridian-holdpoint.vercel.app" as const;

export const DOCTRINE_CARD_PRINCIPLES = [
  "Missing authority -> HOLD",
  "Missing evidence -> HOLD",
  "Exceeds proof boundary -> BLOCK",
  "Contradicted by trusted proof -> REVOKE",
] as const;

export const DOCTRINE_CARD_QR_NOTE =
  "No QR is rendered here. Add a QR only from a verified static asset or by print-shop process after checking the deployed URL." as const;
