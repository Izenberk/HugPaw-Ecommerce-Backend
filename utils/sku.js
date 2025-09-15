// server/utils/sku.js
export const canon = (s) =>
  String(s ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

export const cleanToken = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9.-]/g, "");

const TYPE_CODES = { collar: "COL", dispenser: "DPS", feeder: "FDR", "smart module": "SMF" };
const VALUE_CODES = {
  color: { black: "BLK", white: "WHT", blue: "BLU" },     // extend when you like
  power: { "usb-c": "USBC" },
  // others optional…
};
const KEY_ORDER = ["size","capacity","color","filtration","pump & hygiene","power","power mode","smart add-ons","bowl material","feature","name","compatible with"];

function getAttr(attrs = [], key) {
  const t = canon(key);
  return (attrs || []).find(a => canon(a.k) === t)?.v ?? "";
}
function sortAttrs(attrs = []) {
  const ord = new Map(KEY_ORDER.map((k, i) => [k, i]));
  return (attrs || [])
    .filter(a => a?.k && a?.v && canon(a.k) !== "type")
    .slice()
    .sort((a, b) => {
      const ak = canon(a.k), bk = canon(b.k);
      const ai = ord.has(ak) ? ord.get(ak) : 999, bi = ord.has(bk) ? ord.get(bk) : 999;
      return ai === bi ? ak.localeCompare(bk) : ai - bi;
    });
}
function lookupCode(key, value) {
  const K = canon(key), V = canon(value);
  const table = VALUE_CODES[K];
  return table?.[V] || cleanToken(value); // non-locking fallback
}

export function computeSkuFromAttributes(attrs = []) {
  const type = canon(getAttr(attrs, "Type"));
  const head = TYPE_CODES[type] || cleanToken(type || "").slice(0, 3) || "PRD";
  const tail = sortAttrs(attrs).map(a => lookupCode(a.k, a.v)).filter(Boolean);
  return [head, ...tail].join("-").replace(/-+/g, "-");
}
