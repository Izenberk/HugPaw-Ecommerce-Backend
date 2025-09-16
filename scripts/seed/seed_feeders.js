/* ==== HugPaw: Smart Feeder variants ==== */
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
  const NAME = "HugPaw Smart Feeder";
  const anchorSku = "FDR-2L-WHT-DC-BPL";
  const baseDesc =
    "Automated feeding with portion control, schedules, and optional camera.";

  const SIZE  = ["2 L", "4 L", "6 L"];
  const COLOR = ["White", "Black", "Sand"];
  const POWER = ["DC Adapter", "DC + Battery Backup", "USB-C PD"];
  const BOWL  = ["BPA-Free Plastic", "Stainless Steel", "Ceramic"];

  const SIZE_CODE  = { "2 L": "2L", "4 L": "4L", "6 L": "6L" };
  const COLOR_CODE = { White: "WHT", Black: "BLK", Sand: "SND" };
  const POWER_CODE = {
    "DC Adapter": "DC",
    "DC + Battery Backup": "DCB",
    "USB-C PD": "USBCPD", // align with backend if needed
  };
  const BOWL_CODE  = { "BPA-Free Plastic": "BPL", "Stainless Steel": "STS", Ceramic: "CER" };

  const priceBase = { "2 L": 750, "4 L": 850, "6 L": 950 };
  const stockDefault = 30;

  const docs = [];
  for (const s of SIZE) {
    for (const c of COLOR) {
      for (const p of POWER) {
        for (const b of BOWL) {
          const sku = `FDR-${SIZE_CODE[s]}-${COLOR_CODE[c]}-${POWER_CODE[p]}-${BOWL_CODE[b]}`;
          docs.push({
            sku,
            name: NAME,
            slug: sku.toLowerCase(),
            description: baseDesc,
            price: priceBase[s],
            stock: stockDefault,
            images: [{ url: "/images/products/Collage-Feeder.jpg" }],
            tags: ["feeder", "pet", "smart"],
            attributes: kv({
              Size: s,
              Color: c,
              "Power Mode": p,
              "Bowl Material": b,
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
