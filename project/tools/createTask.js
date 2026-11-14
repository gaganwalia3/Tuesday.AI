const db = require("../memory/database");

async function createTask(args) {

    const title = args.title;
    const description = args.description || null;
    const dueAt = args.dueAt || null;

    if (!title || typeof title !== "string") {
        throw new Error("Task title is required.");
    }

    const [result] = await db.execute(
        `INSERT INTO tasks
            (title, description, due_at)
         VALUES (?, ?, ?)`,
        [title, description, dueAt]
    );

    return {
        success: true,
        id: result.insertId,
        title,
        description,
        dueAt,
        status: "pending",
        message: "Task created successfully."
    };
}

module.exports = createTask;