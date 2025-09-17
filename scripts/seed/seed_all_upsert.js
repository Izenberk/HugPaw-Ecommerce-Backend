/* ==========================================================
   HugPaw — bulk upsert (minimal product doc format)
   Fields: sku, attributes, unitPrice, stockAmount, createdAt, updatedAt
========================================================== */

const COL = db.getCollection("products");
const now = new Date();

/* ----------------- helpers ----------------- */
function kv(obj) {
  return Object.entries(obj).map(([k, v]) => ({ k, v }));
}

function makeDoc({ sku, attrs, unitPrice, stockAmount }) {
  return {
    sku,
    attributes: attrs,
    unitPrice,
    stockAmount,
  };
}

function upsertMany(docs, label) {
  const now = new Date();
  const ops = docs.map((d) => {
    // build $set without createdAt
    const setDoc = {
      sku: d.sku,
      attributes: d.attributes,
      unitPrice: d.unitPrice,
      stockAmount: d.stockAmount,
      updatedAt: now,           // always updated here
    };
    return {
      updateOne: {
        filter: { sku: d.sku },
        update: {
          $setOnInsert: { createdAt: now },  // only created on first insert
          $set: setDoc,                      // no createdAt here!
        },
        upsert: true,
      },
    };
  });

  const res = COL.bulkWrite(ops, { ordered: false });
  print(`[${label}] upserted=${res.upsertedCount}, modified=${res.modifiedCount}`);
}


/* =======================================================
   COLLAR
======================================================= */
(() => {
  const COLORS = ["Black", "Red", "Blue", "Green"];
  const SIZES  = ["XS", "S", "M", "L", "XL"];
  const COLOR_CODE = { Black: "BLK", Red: "RED", Blue: "BLUE", Green: "GRN" };

  const docs = [];
  for (const size of SIZES) {
    for (const color of COLORS) {
      docs.push(makeDoc({
        sku: `COL-${size}-${COLOR_CODE[color]}`,
        attrs: kv({ Kind:"Variant", Type:"Collar", Size:size, Color:color }),
        unitPrice: 400,
        stockAmount: 100,
      }));
    }
  }
  upsertMany(docs, "collar");
})();

/* =======================================================
   FEEDER
======================================================= */
(() => {
  const SIZE  = ["2L", "4L", "6L"];
  const COLOR = ["White", "Black", "Sand"];
  const POWER = ["DC", "DCB", "USBCPD"];
  const BOWL  = ["BPL", "STS", "CER"];

  const docs = [];
  for (const s of SIZE) {
    for (const c of COLOR) {
      for (const p of POWER) {
        for (const b of BOWL) {
          docs.push(makeDoc({
            sku: `FDR-${s}-${c}-${p}-${b}`,
            attrs: kv({ Kind:"Variant", Type:"Feeder", Size:s, Color:c, "Power Mode":p, "Bowl Material":b }),
            unitPrice: 750,
            stockAmount: 75,
          }));
        }
      }
    }
  }
  upsertMany(docs, "feeder");
})();

/* =======================================================
   WATER DISPENSER
======================================================= */
(() => {
  const SIZE  = ["1.5", "2.5", "3.5"];
  const COLOR = ["White", "Graphite", "Mint"];
  const FILT  = ["STD", "TRI"];
  const POWER = ["USBC", "BAT"];

  const docs = [];
  for (const s of SIZE) {
    for (const c of COLOR) {
      for (const f of FILT) {
        for (const p of POWER) {
          docs.push(makeDoc({
            sku: `DPS-${s}-${c}-${f}-${p}`,
            attrs: kv({ Kind:"Variant", Type:"Water Dispenser", Size:s, Color:c, Filtration:f, Power:p }),
            unitPrice: 700,
            stockAmount: 80,
          }));
        }
      }
    }
  }
  upsertMany(docs, "water");
})();

/* =======================================================
   SMART FEATURES (ADD-ONS)
======================================================= */
(() => {
  const KIND = "Addon";
  const TYPE = "Smart Module";

  const ADDONS = [
    { sku:"SMF-GPS",     forType:"Collar" },
    { sku:"SMF-LED",     forType:"Collar" },
    { sku:"SMF-NFC",     forType:"Collar" },
    { sku:"SMF-WIFI",    forType:"Feeder" },
    { sku:"SMF-CAMERA",  forType:"Feeder" },
    { sku:"SMF-VOICE",   forType:"Feeder" },
    { sku:"SMF-QUIET",   forType:"Water Dispenser" },
    { sku:"SMF-UVC",     forType:"Water Dispenser" },
    { sku:"SMF-LOWLEVEL",forType:"Water Dispenser" },
  ];

  const docs = ADDONS.map(a => makeDoc({
    sku: a.sku,
    attrs: kv({ Kind:KIND, Type:TYPE, "For Type":a.forType }),
    unitPrice: 0,
    stockAmount: 100,
  }));

  upsertMany(docs, "addons");
})();
