/**
 * Atlas Trigger: Generate Voyage AI embeddings for `movies` collection.
 * Fires on insert, replace or update of documents.
 * Expects a text field, defined below, to create embeddings for.
 * Writes the updated embeddings to the same document.
 */
exports = async function(changeEvent) {
  const COLLECTION_NAME = "movies";
  const CLUSTER_NAME = "Cluster0";
  const EMBEDDING_FIELD = "fullplot_embedding";
  const TEXT_FIELD = "fullplot";
  const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";
  const VOYAGE_MODEL = "voyage-3-large";
  const VOYAGE_TIMEOUT_MS = 10000;
  let updatedFields = {};
  
  const docID = changeEvent.documentKey._id;
  console.log(`Trigger fired with an ${changeEvent.operationType} action on ${changeEvent.ns.db}.${changeEvent.ns.coll} collection`);
  console.log("Change Event:", JSON.stringify(changeEvent));
  // 1️⃣ Only continue if the description field changed (or document inserted)
  if (changeEvent.operationType === "update") {
    updatedFields = changeEvent.updateDescription?.updatedFields || {};
    //console.log("Updated field text:", JSON.stringify(updatedFields?.[TEXT_FIELD]));
    //console.log("The _id for the changed document is ", docID);
    if (!(TEXT_FIELD in updatedFields)) {
      console.log(`'${TEXT_FIELD}' not modified — skipping embedding update.`);
      return;
    }
  } else if (changeEvent.operationType === "insert" || changeEvent.operationType === "replace") {
    updatedFields = changeEvent.fullDocument || {};
    //console.log("Inserted document text:", JSON.stringify(updatedFields?.[TEXT_FIELD]));
    //console.log("The _id for the inserted document is ", docID);
  } else {
    console.log(`Unsupported operationType '${changeEvent.operationType}' — skipping embedding update.`);
    return;
  }
  const textToEmbed = updatedFields?.[TEXT_FIELD];
  if (!textToEmbed || typeof textToEmbed !== "string" || !textToEmbed.trim()) {
    console.log(`Document ${docID} has no valid '${TEXT_FIELD}' text.`);
    return;
  }
  const VOYAGE_API_KEY = context.values.get("VOYAGE-API-KEY");
  if (!VOYAGE_API_KEY) {
    console.error("Voyage AI API key not configured in Atlas values!");
    return;
  }
  // 2️⃣ Call Voyage AI to generate vector embedding
  const payload = { model: VOYAGE_MODEL, input: textToEmbed };
  async function postWithRetry(options, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await context.http.post(options);
        if (res.statusCode === 200) return res;
        console.warn(`Attempt ${i + 1}: Voyage returned ${res.statusCode}`);
      } catch (err) {
        console.warn(`Attempt ${i + 1} failed:`, err.message);
      }
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    throw new Error("All retries to Voyage failed");
  }
  let response;
  try {
    response = await postWithRetry({
      url: VOYAGE_ENDPOINT,
      headers: {
        "Authorization": [`Bearer ${VOYAGE_API_KEY}`],
        "Content-Type": ["application/json"]
      },
      body: JSON.stringify(payload),
      timeout: VOYAGE_TIMEOUT_MS
    });
  } catch (err) {
    console.error("HTTP request to Voyage AI failed:", err);
    return;
  }
  // 3️⃣ Extract embedding from response.
  let embedding;
  try {
    const data = JSON.parse(response.body.text() ?? response.body);
    embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) throw new Error("No valid embedding array returned");
  } catch (err) {
    console.error("Failed to parse Voyage AI response:", err.message);
    console.error("Response snippet:", response.body?.slice?.(0, 200));
    return;
  }
  // 4️⃣ Check for race condition (stale description)
  const db = context.services.get(CLUSTER_NAME).db(changeEvent.ns.db);
  const coll = db.collection(COLLECTION_NAME);
  //console.log(`Fetched embedding of length ${embedding.length} from Voyage AI.`);
  const currentDoc = await coll.findOne({ _id: docID }, { [TEXT_FIELD] : 1 } );
  
  console.log("Current document text field:", JSON.stringify(currentDoc));
  console.log("Text to embed:", textToEmbed);
  if ((currentDoc?.[TEXT_FIELD] !== textToEmbed) && (changeEvent.operationType === "update")) {
    console.log("Either the document was not found or the description changed again before embedding completed — skipping outdated embedding.");
    return;
  }
  // 5️⃣ Write embedding back to the original document.
  try {
    await coll.updateOne(
      { _id: docID },
      { $set: { [EMBEDDING_FIELD]: embedding } },
      { writeConcern: { w: "majority" } }
    );
    console.log(`✅ Updated embedding for movie ${docID}`);
  } catch (err) {
    console.error("Failed to update document with embedding:", err);
  }
};