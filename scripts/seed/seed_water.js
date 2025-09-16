/* ==== HugPaw: Smart Water Dispenser variants ==== */
const COL = db.getCollection("products");
const now = new Date();

/* helpers */
const kv = (obj) => Object.entries(obj).map(([k, v]) => ({ k, v }));
function insertManySafe(col, docs) {
  if (!docs.length) return;
  try {
    col.insertMany(docs, { ordered: false });
    print(`Inserted ${docs.length} docs into ${col.getName()}`);
  } catch (e) {
    if (e.code === 11000) print("Some duplicates skipped."); else throw e;
  }
}

/* variants */
(() => {
  const NAME = "HugPaw Smart Water Dispenser";
  const anchorSku = "DPS-1.5-WHT-STD-USBC";
  const baseDesc =
    "Fresh, filtered water on tap. Ultra-quiet pump with replaceable filters.";

  const SIZE  = ["1.5L", "2.5L", "3.5L"];
  const COLOR = ["White", "Graphite", "Mint"];
  const FILT  = ["Standard Charcoal", "Triple-Stage"];
  const POWER = ["USB-C", "Battery"];

  // inferred codes (adjust to your backend if different)
  const SIZE_CODE  = { "1.5L": "1.5", "2.5L": "2.5", "3.5L": "3.5" };
  const COLOR_CODE = { White: "WHT", Graphite: "GPH", Mint: "MNT" };
  const FILT_CODE  = { "Standard Charcoal": "STD", "Triple-Stage": "TRI" };
  const POWER_CODE = { "USB-C": "USBC", Battery: "BAT" };

  const priceBase = { "1.5L": 700, "2.5L": 780, "3.5L": 860 };
  const stockDefault = 40;

  const docs = [];
  for (const s of SIZE) {
    for (const c of COLOR) {
      for (const f of FILT) {
        for (const p of POWER) {
          const sku = `DPS-${SIZE_CODE[s]}-${COLOR_CODE[c]}-${FILT_CODE[f]}-${POWER_CODE[p]}`;
          docs.push({
            sku,
            name: NAME,
            slug: sku.toLowerCase(),
            description: baseDesc,
            price: priceBase[s],
            stock: stockDefault,
            images: [{ url: "/images/products/Collage-Water-Dispenser.jpg" }],
            tags: ["water", "pet", "smart"],
            attributes: kv({
              Size: s,
              Color: c,
              Filtration: f,
              Power: p,
            }),
            anchorSku,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  }
  insertManySafe(COL, docs);
})();
