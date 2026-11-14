const db = require("../memory/database");

async function completeTask(args) {

    const id = Number(args.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("A valid task ID is required.");
    }

    const [rows] = await db.execute(
        "SELECT id, title, status FROM tasks WHERE id = ?",
        [id]
    );

    if (rows.length === 0) {
        throw new Error(`Task with ID ${id} does not exist.`);
    }

    if (rows[0].status === "completed") {
        return {
            success: true,
            id,
            message: "Task is already completed."
        };
    }

    await db.execute(
        `UPDATE tasks
         SET status = 'completed',
             completed_at = NOW()
         WHERE id = ?`,
        [id]
    );

    return {
        success: true,
        id,
        title: rows[0].title,
        status: "completed",
        message: "Task completed successfully."
    };
}

module.exports = completeTask;