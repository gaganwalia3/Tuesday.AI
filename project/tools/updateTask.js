const db = require("../memory/database");

async function updateTask(args) {

    const id = Number(args.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("A valid task ID is required.");
    }

    // ==========================================
    // CHECK TASK EXISTS
    // ==========================================

    const [rows] = await db.execute(
        `SELECT id, title, description, due_at, status
         FROM tasks
         WHERE id = ?`,
        [id]
    );

    if (rows.length === 0) {
        throw new Error(`Task with ID ${id} does not exist.`);
    }

    const currentTask = rows[0];

    // ==========================================
    // KEEP EXISTING VALUES IF NOT PROVIDED
    // ==========================================

    const title =
        args.title !== undefined
            ? args.title
            : currentTask.title;

    const description =
        args.description !== undefined
            ? args.description
            : currentTask.description;

    const dueAt =
        args.dueAt !== undefined
            ? args.dueAt
            : currentTask.due_at;

    // ==========================================
    // UPDATE
    // ==========================================

    await db.execute(
        `UPDATE tasks
         SET title = ?,
             description = ?,
             due_at = ?
         WHERE id = ?`,
        [
            title,
            description,
            dueAt,
            id
        ]
    );

    // ==========================================
    // RETURN UPDATED TASK
    // ==========================================

    const [updatedRows] = await db.execute(
        `SELECT
            id,
            title,
            description,
            due_at,
            status,
            created_at,
            completed_at
         FROM tasks
         WHERE id = ?`,
        [id]
    );

    return {
        success: true,
        task: updatedRows[0],
        message: "Task updated successfully."
    };
}

module.exports = updateTask;