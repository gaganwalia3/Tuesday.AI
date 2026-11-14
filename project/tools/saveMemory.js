const db = require("../memory/database");
const { generateEmbedding } = require("../memory/embedding");
const { getMemoryCollection } = require("../memory/chroma");

async function saveMemory(args) {
    const content = args.content;

    if (!content) {
        throw new Error("Memory content is required.");
    }

    // 1. Save actual memory in MySQL
    const [result] = await db.execute(
        "INSERT INTO memories (content) VALUES (?)",
        [content]
    );

    const memoryId = result.insertId;

    // 2. Generate embedding
    const embedding = await generateEmbedding(content);

    // 3. Save vector in Chroma using the MySQL ID
    const collection = await getMemoryCollection();

    await collection.add({
        ids: [String(memoryId)],
        embeddings: [embedding],
        documents: [content],
        metadatas: [
            {
                mysql_id: memoryId
            }
        ]
    });

    return {
        success: true,
        id: memoryId,
        message: "Memory saved successfully to MySQL and Chroma."
    };
}

module.exports = saveMemory;