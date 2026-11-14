const db = require("../memory/database");
const { generateEmbedding } = require("../memory/embedding");
const { getMemoryCollection } = require("../memory/chroma");

async function searchMemory(args) {

    const query = args.query;

    if (!query) {
        throw new Error("Memory search query is required.");
    }

    // 1. Convert query into an embedding
    const queryEmbedding = await generateEmbedding(query);

    // 2. Search Chroma semantically
    const collection = await getMemoryCollection();

    const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 5,
        include: ["documents", "metadatas", "distances"]
    });

    const chromaIds = results.ids[0];

    if (!chromaIds || chromaIds.length === 0) {
        return [];
    }

    // 3. Convert Chroma IDs back to MySQL IDs
    const mysqlIds = chromaIds.map(id => Number(id));

    // 4. Fetch actual records from MySQL
    const placeholders = mysqlIds.map(() => "?").join(",");

    const [rows] = await db.execute(
        `SELECT id, content, created_at
         FROM memories
         WHERE id IN (${placeholders})`,
        mysqlIds
    );

    // 5. Preserve Chroma's similarity ranking
    const rankedRows = mysqlIds
        .map(id => rows.find(row => row.id === id))
        .filter(Boolean);

    return rankedRows;
}

module.exports = searchMemory;