const db = require("../memory/database");
const { getMemoryCollection } = require("../memory/chroma");

async function deleteMemory(args) {

    const id = Number(args.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("A valid memory ID is required.");
    }


    // ==========================================
    // 1. CHECK MEMORY EXISTS
    // ==========================================

    const [rows] = await db.execute(
        "SELECT id, content FROM memories WHERE id = ?",
        [id]
    );

    if (rows.length === 0) {
        throw new Error(`Memory with ID ${id} does not exist.`);
    }


    // ==========================================
    // 2. DELETE FROM MYSQL
    // ==========================================

    await db.execute(
        "DELETE FROM memories WHERE id = ?",
        [id]
    );


    // ==========================================
    // 3. DELETE FROM CHROMA
    // ==========================================

    const collection = await getMemoryCollection();

    await collection.delete({
        ids: [String(id)]
    });


    return {
        success: true,
        id,
        message: "Memory deleted successfully."
    };
}

module.exports = deleteMemory;