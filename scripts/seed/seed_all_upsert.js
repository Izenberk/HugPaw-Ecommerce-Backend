/* ==== HugPaw bulk upsert (SKU-only) ==== */

const COL = db.getCollection("products");
const now = new Date();

/* ---------- helpers ---------- */
const kv = (obj) => Object.entries(obj).map(([k, v]) => ({ k, v }));

function upsertManyBySku(col, docs) {
  if (!docs.length) return;
  const ops = docs.map(d => ({
    updateOne: {
      filter: { sku: d.sku },
      update: {
        $setOnInsert: { createdAt: d.createdAt || now },
        $set: {
          name: d.name,
          description: d.description,
          price: d.price,
          stock: d.stock,
          images: d.images,
          tags: d.tags,
          attributes: d.attributes,
          anchorSku: d.anchorSku,
          updatedAt: new Date(),
        }
      },
      upsert: true,
    }
  }));
  const res = col.bulkWrite(ops, { ordered: false });
  print(`Upserted: ${res.upsertedCount}, Modified: ${res.modifiedCount}, Matched: ${res.matchedCount}`);
}

/* ---------- ensure indexes ---------- */
(() => {
  try { COL.createIndex({ sku: 1 }, { unique: true }); print("Index ok: sku(unique)"); } catch(e) { print(e.message); }
  try { COL.createIndex({ "attributes.k": 1, "attributes.v": 1 }); print("Index ok: attributes.k/v"); } catch(e) { print(e.message); }
})();

/* =======================================================
   1) SMART COLLAR VARIANTS (COL-)
======================================================= */
(() => {
  const NAME = "HugPaw Smart Collar";
  const anchorSku = "COL-M-BLUE";
  const baseDesc = "More than just a collar—it's their identity. Customize color and size. Compatible with smart features.";

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
        description: baseDesc,
        price: priceBySize[size],
        stock: stockDefault,
        images: [{ url: "/images/products/Collar1.jpg" }],
        tags: ["collar", "pet", "smart"],
        attributes: kv({ Kind: "Variant", Type: "Collar", Color: color, Size: size }),
        anchorSku,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  upsertManyBySku(COL, docs);
})();

/* =======================================================
   2) SMART FEEDER VARIANTS (FDR-)
======================================================= */
(() => {
  const NAME = "HugPaw Smart Feeder";
  const anchorSku = "FDR-2L-WHT-DC-BPL";
  const baseDesc = "Automated feeding with portion control, schedules, and optional camera.";

  const SIZE  = ["2 L", "4 L", "6 L"];
  const COLOR = ["White", "Black", "Sand"];
  const POWER = ["DC Adapter", "DC + Battery Backup", "USB-C PD"];
  const BOWL  = ["BPA-Free Plastic", "Stainless Steel", "Ceramic"];

  const SIZE_CODE  = { "2 L": "2L", "4 L": "4L", "6 L": "6L" };
  const COLOR_CODE = { White: "WHT", Black: "BLK", Sand: "SND" };
  const POWER_CODE = { "DC Adapter": "DC", "DC + Battery Backup": "DCB", "USB-C PD": "USBCPD" };
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
            description: baseDesc,
            price: priceBase[s],
            stock: stockDefault,
            images: [{ url: "/images/products/Collage-Feeder.jpg" }],
            tags: ["feeder", "pet", "smart"],
            attributes: kv({
              Kind: "Variant",
              Type: "Feeder",
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
  upsertManyBySku(COL, docs);
})();

/* =======================================================
   3) SMART WATER DISPENSER VARIANTS (DPS-)
======================================================= */
(() => {
  const NAME = "HugPaw Smart Water Dispenser";
  const anchorSku = "DPS-1.5-WHT-STD-USBC";
  const baseDesc = "Fresh, filtered water on tap. Ultra-quiet pump with replaceable filters.";

  const SIZE  = ["1.5L", "2.5L", "3.5L"];
  const COLOR = ["White", "Graphite", "Mint"];
  const FILT  = ["Standard Charcoal", "Triple-Stage"];
  const POWER = ["USB-C", "Battery"];

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
            description: baseDesc,
            price: priceBase[s],
            stock: stockDefault,
            images: [{ url: "/images/products/Collage-Water-Dispenser.jpg" }],
            tags: ["water", "pet", "smart"],
            attributes: kv({
              Kind: "Variant",
              Type: "Water Dispenser",
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
  upsertManyBySku(COL, docs);
})();

/* =======================================================
   4) ADD-ONS (SMF-*)
======================================================= */
(() => {
  const ADDONS = [
    { sku: "SMF-GPS",     name: "GPS Tracker",                  desc: "Real-time location tracking for adventurous pets." },
    { sku: "SMF-LED",     name: "LED Light",                    desc: "Visibility at night with low-power LED strip." },
    { sku: "SMF-NFC",     name: "NFC Tag",                      desc: "Tap-to-identify tag for quick owner contact." },
    { sku: "SMF-WIFI",    name: "Wi-Fi App Control",            desc: "Remote control, scheduling, and logs via mobile app." },
    { sku: "SMF-CAMERA",  name: "1080p Camera + 2-Way Audio",   desc: "Watch, talk, and record during mealtime." },
    { sku: "SMF-VOICE",   name: "Custom Mealtime Voice",        desc: "Record a personalized call for your pet." },
    { sku: "SMF-QUIET",   name: "Ultra-Quiet Pump",             desc: "Hushed operation for sensitive pets." },
    { sku: "SMF-UVC",     name: "UV-C Sterilization",           desc: "Sterilize water path to reduce germs." },
    { sku: "SMF-LOWLEVEL",name: "Low-Water Alert",              desc: "Get notified when it’s time to refill." },
  ];

  const docs = ADDONS.map(a => ({
    sku: a.sku,
    name: a.name,
    description: a.desc,
    price: 0,
    stock: 100,
    images: [],
    tags: ["addon", "smart"],
    attributes: kv({ Kind: "Add-on", Type: "Feature" }),
    createdAt: now,
    updatedAt: now,
  }));

  upsertManyBySku(COL, docs);
})();
