const db = require("../memory/database");
const { generateEmbedding } = require("../memory/embedding");
const { getMemoryCollection } = require("../memory/chroma");

async function updateMemory(args) {

    const id = Number(args.id);
    const content = args.content;

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("A valid memory ID is required.");
    }

    if (!content || typeof content !== "string") {
        throw new Error("Memory content is required.");
    }


    // ==========================================
    // 1. CHECK MEMORY EXISTS
    // ==========================================

    const [rows] = await db.execute(
        "SELECT id FROM memories WHERE id = ?",
        [id]
    );

    if (rows.length === 0) {
        throw new Error(`Memory with ID ${id} does not exist.`);
    }


    // ==========================================
    // 2. UPDATE MYSQL
    // ==========================================

    await db.execute(
        "UPDATE memories SET content = ? WHERE id = ?",
        [content, id]
    );


    // ==========================================
    // 3. GENERATE NEW EMBEDDING
    // ==========================================

    const embedding = await generateEmbedding(content);


    // ==========================================
    // 4. UPDATE CHROMA
    // ==========================================

    const collection = await getMemoryCollection();

    await collection.update({
        ids: [String(id)],
        embeddings: [embedding],
        documents: [content],
        metadatas: [
            {
                mysql_id: id
            }
        ]
    });


    return {
        success: true,
        id,
        content,
        message: "Memory updated successfully."
    };
}

module.exports = updateMemory;