/* ==== HugPaw: Add-ons (features) ==== */
const COL = db.getCollection("products");
const now = new Date();

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

  const docs = ADDONS.map((a) => ({
    sku: a.sku,
    name: a.name,
    slug: a.sku.toLowerCase(),
    description: a.desc,
    price: 0,          // set real price if selling add-ons standalone
    stock: 100,
    images: [],
    tags: ["addon", "smart"],
    attributes: kv({ Type: "Add-on" }),
    createdAt: now,
    updatedAt: now,
  }));

  insertManySafe(COL, docs);
})();
