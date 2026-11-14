const db = require("../memory/database");

async function deleteTask(args) {

    const id = Number(args.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("A valid task ID is required.");
    }

    const [rows] = await db.execute(
        "SELECT id, title FROM tasks WHERE id = ?",
        [id]
    );

    if (rows.length === 0) {
        throw new Error(`Task with ID ${id} does not exist.`);
    }

    await db.execute(
        "DELETE FROM tasks WHERE id = ?",
        [id]
    );

    return {
        success: true,
        id,
        title: rows[0].title,
        message: "Task deleted successfully."
    };
}

module.exports = deleteTask;