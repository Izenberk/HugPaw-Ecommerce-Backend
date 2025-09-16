/* ==== HugPaw: ensure indexes (run once) ==== */
const COL = db.getCollection("products");
try { COL.createIndex({ sku: 1 }, { unique: true }); print("Index ok: sku"); } catch(e) { print(e.message); }
try { COL.createIndex({ slug: 1 }, { unique: false }); print("Index ok: slug"); } catch(e) { print(e.message); }
try { COL.createIndex({ "attributes.k": 1, "attributes.v": 1 }); print("Index ok: attributes.k/v"); } catch(e) { print(e.message); }
