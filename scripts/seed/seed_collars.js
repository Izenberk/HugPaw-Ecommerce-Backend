/* ==== HugPaw: Smart Collar variants ==== */
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
  const NAME = "HugPaw Smart Collar";
  const anchorSku = "COL-M-BLUE";
  const baseDesc =
    "More than just a collar—it's their identity. Customize color and size. Compatible with smart features.";

  const COLORS = ["Black", "Red", "Blue", "Green"];
  const SIZES  = ["XS", "S", "M", "L", "XL"];
  const COLOR_CODE = { Black: "BLACK", Blue: "BLUE", Red: "RED", Green: "GREEN" };

  const priceBySize = { XS: 380, S: 390, M: 400, L: 420, XL: 450 };
  const stockDefault = 50;

  const docs = [];
  for (const size of SIZES) {
    for (const color of COLORS) {
      const code = COLOR_CODE[color];
      const sku = `COL-${size}-${code}`;
      docs.push({
        sku,
        name: NAME,
        slug: sku.toLowerCase(),
        description: baseDesc,
        price: priceBySize[size],
        stock: stockDefault,
        images: [{ url: "/images/products/Collar1.jpg" }],
        tags: ["collar", "pet", "smart"],
        attributes: kv({ Color: color, Size: size }),
        anchorSku,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  insertManySafe(COL, docs);
})();
