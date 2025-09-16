/* ==========================================================
   HugPaw — bulk upsert (variants + smart features)
   Run:
     export MONGODB_URI="mongodb+srv://user:pass@cluster/dbname"
     mongosh "$MONGODB_URI" --file scripts/seed/seed_all_upsert.js
========================================================== */

const COL = db.getCollection("products");
const now = new Date();

/* ----------------- helpers ----------------- */
const kv = (obj) => Object.entries(obj).map(([k, v]) => ({ k, v }));

function upsertManyBySku(col, docs, label = "batch") {
  if (!docs.length) return;
  const ops = docs.map((d) => ({
    updateOne: {
      filter: { sku: d.sku },
      update: {
        $setOnInsert: { createdAt: d.createdAt || now },
        $set: {
          // canonical
          unitPrice: d.unitPrice,
          stockAmount: d.stockAmount,

          // legacy mirrors (for older UI paths)
          price: d.unitPrice,
          stock: d.stockAmount,

          // common fields
          name: d.name,
          description: d.description,
          images: d.images,
          tags: d.tags,
          attributes: d.attributes,
          anchorSku: d.anchorSku,
          // optional smart feature fingerprints
          fp: d.fp,
          fpHash: d.fpHash,

          updatedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  const res = col.bulkWrite(ops, { ordered: false });
  print(`[${label}] Upserted: ${res.upsertedCount}, Modified: ${res.modifiedCount}, Matched: ${res.matchedCount}`);
}

/* ------------ minimal SHA-256 + fp builder (for mongosh) ------------ */
function sha256hex(str) {
  function rrot(n, x) { return (x >>> n) | (x << (32 - n)); }
  function utf8ToWords(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 128) bytes.push(c);
      else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
      else if (c < 55296 || c >= 57344) bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      else { i++; const cp = 65536 + (((c & 1023) << 10) | (s.charCodeAt(i) & 1023));
        bytes.push(240 | (cp >> 18), 128 | ((cp >> 12) & 63), 128 | ((cp >> 6) & 63), 128 | (cp & 63)); }
    }
    const l = bytes.length, words = [];
    for (let i = 0; i < l; i++) words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] << (24 - (i % 4) * 8));
    words[l >> 2] = (words[l >> 2] || 0) | (0x80 << (24 - (l % 4) * 8));
    words[((l + 64 >> 9) << 4) + 15] = l * 8;
    return words;
  }
  const K = [1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
  const W = new Array(64);
  let H0 = 1779033703, H1 = 3144134277, H2 = 1013904242, H3 = 2773480762, H4 = 1359893119, H5 = 2600822924, H6 = 528734635, H7 = 1541459225;
  const M = utf8ToWords(str);
  for (let i = 0; i < M.length; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = M[i + t] | 0;
    for (let t = 16; t < 64; t++) {
      const s0 = rrot(7, W[t-15]) ^ rrot(18, W[t-15]) ^ (W[t-15] >>> 3);
      const s1 = rrot(17, W[t-2]) ^ rrot(19, W[t-2]) ^ (W[t-2] >>> 10);
      W[t] = (W[t-16] + s0 + W[t-7] + s1) | 0;
    }
    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;
    for (let t = 0; t < 64; t++) {
      const S1 = rrot(6, e) ^ rrot(11, e) ^ rrot(25, e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rrot(2, a) ^ rrot(13, a) ^ rrot(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H0 = (H0 + a) | 0; H1 = (H1 + b) | 0; H2 = (H2 + c) | 0; H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0; H5 = (H5 + f) | 0; H6 = (H6 + g) | 0; H7 = (H7 + h) | 0;
  }
  function hex(n){ return ("00000000" + (n >>> 0).toString(16)).slice(-8); }
  return hex(H0)+hex(H1)+hex(H2)+hex(H3)+hex(H4)+hex(H5)+hex(H7 ? H7 : H6);
}
function buildFp(kind, forType, type) {
  return `for type=${String(forType || "").toLowerCase()}|kind=${String(kind || "").toLowerCase()}|type=${String(type || "").toLowerCase()}`;
}

/* ----------------- ensure indexes ----------------- */
(() => {
  try { COL.createIndex({ sku: 1 }, { unique: true }); print("Index ok: sku(unique)"); } catch (e) { print(e.message); }
  try { COL.createIndex({ "attributes.k": 1, "attributes.v": 1 }); print("Index ok: attributes.k/v"); } catch (e) { print(e.message); }
})();

/* =======================================================
   1) SMART COLLAR VARIANTS (COL-)
   RULE: unitPrice=400, stockAmount=100
======================================================= */
(() => {
  const NAME = "HugPaw Smart Collar";
  const anchorSku = "COL-M-BLUE";
  const baseDesc = "More than just a collar—it's their identity. Customize color and size. Compatible with smart features.";

  const COLORS = ["Black", "Red", "Blue", "Green"];
  const SIZES  = ["XS", "S", "M", "L", "XL"];
  const COLOR_CODE = { Black: "BLACK", Blue: "BLUE", Red: "RED", Green: "GREEN" };

  const UNIT_PRICE = 400;
  const STOCK_AMT  = 100;

  const docs = [];
  for (const size of SIZES) {
    for (const color of COLORS) {
      const sku = `COL-${size}-${COLOR_CODE[color]}`;
      docs.push({
        sku,
        name: NAME,
        description: baseDesc,
        unitPrice: UNIT_PRICE,
        stockAmount: STOCK_AMT,
        images: [{ url: "/images/products/Collar1.jpg" }],
        tags: ["collar", "pet", "smart"],
        attributes: kv({ Kind: "Variant", Type: "Collar", Color: color, Size: size }),
        anchorSku,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  upsertManyBySku(COL, docs, "collar");
})();

/* =======================================================
   2) SMART FEEDER VARIANTS (FDR-)
   RULE: unitPrice=750, stockAmount=75
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

  const UNIT_PRICE = 750;
  const STOCK_AMT  = 75;

  const docs = [];
  for (const s of SIZE) {
    for (const c of COLOR) {
      for (const p of POWER) {
        for (const b of BOWL) {
          docs.push({
            sku: `FDR-${SIZE_CODE[s]}-${COLOR_CODE[c]}-${POWER_CODE[p]}-${BOWL_CODE[b]}`,
            name: NAME,
            description: baseDesc,
            unitPrice: UNIT_PRICE,
            stockAmount: STOCK_AMT,
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
  upsertManyBySku(COL, docs, "feeder");
})();

/* =======================================================
   3) SMART WATER DISPENSER VARIANTS (DPS-)
   RULE: unitPrice=700, stockAmount=80
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

  const UNIT_PRICE = 700;
  const STOCK_AMT  = 80;

  const docs = [];
  for (const s of SIZE) {
    for (const c of COLOR) {
      for (const f of FILT) {
        for (const p of POWER) {
          docs.push({
            sku: `DPS-${SIZE_CODE[s]}-${COLOR_CODE[c]}-${FILT_CODE[f]}-${POWER_CODE[p]}`,
            name: NAME,
            description: baseDesc,
            unitPrice: UNIT_PRICE,
            stockAmount: STOCK_AMT,
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
  upsertManyBySku(COL, docs, "water");
})();

/* =======================================================
   4) SMART FEATURES (Add-ons) — SMF-*
   Keywords: Kind=Addon, Type=Smart Module, For Type=<...>
   fp = "for type=<v>|kind=addon|type=smart module"
   fpHash = sha256(fp)
   Default unitPrice=0, stockAmount=100 (adjust any time)
======================================================= */
(() => {
  const KIND = "Addon";
  const TYPE = "Smart Module";

  const ADDONS = [
    // Collar
    { sku: "SMF-GPS",      name: "GPS Tracker",                desc: "Real-time location tracking for adventurous pets.", forType: "Collar" },
    { sku: "SMF-LED",      name: "LED Light",                  desc: "Visibility at night with low-power LED strip.",     forType: "Collar" },
    { sku: "SMF-NFC",      name: "NFC Tag",                    desc: "Tap-to-identify tag for quick owner contact.",      forType: "Collar" },
    // Feeder
    { sku: "SMF-WIFI",     name: "Wi-Fi App Control",          desc: "Remote control, scheduling, and logs via app.",     forType: "Feeder" },
    { sku: "SMF-CAMERA",   name: "1080p Camera + 2-Way Audio", desc: "Watch, talk, and record during mealtime.",          forType: "Feeder" },
    { sku: "SMF-VOICE",    name: "Custom Mealtime Voice",      desc: "Record a personalized call for your pet.",          forType: "Feeder" },
    // Water Dispenser
    { sku: "SMF-QUIET",    name: "Ultra-Quiet Pump",           desc: "Hushed operation for sensitive pets.",              forType: "Water Dispenser" },
    { sku: "SMF-UVC",      name: "UV-C Sterilization",         desc: "Sterilize water path to reduce germs.",             forType: "Water Dispenser" },
    { sku: "SMF-LOWLEVEL", name: "Low-Water Alert",            desc: "Get notified when it’s time to refill.",            forType: "Water Dispenser" },
  ];

  const UNIT_PRICE = 0;
  const STOCK_AMT  = 100;

  const docs = ADDONS.map((a) => {
    const attrs = [
      { k: "Kind",     v: KIND },
      { k: "For Type", v: a.forType },
      { k: "Type",     v: TYPE },
    ];
    const fp = buildFp(KIND, a.forType, TYPE);
    const fpHash = sha256hex(fp);

    return {
      sku: a.sku,
      name: a.name,
      description: a.desc,
      unitPrice: UNIT_PRICE,
      stockAmount: STOCK_AMT,
      price: UNIT_PRICE, // mirrors
      stock: STOCK_AMT,  // mirrors
      images: [],
      tags: ["addon", "smart"],
      attributes: attrs,
      fp,
      fpHash,
      createdAt: now,
      updatedAt: now,
    };
  });

  upsertManyBySku(COL, docs, "addons");
})();
