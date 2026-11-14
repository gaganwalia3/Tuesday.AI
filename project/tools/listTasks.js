const db = require("../memory/database");

async function listTasks(args) {

    const status = args.status || "pending";

    let query = `
        SELECT
            id,
            title,
            description,
            due_at,
            status,
            created_at,
            completed_at
        FROM tasks
    `;

    const params = [];

    if (status !== "all") {
        query += " WHERE status = ?";
        params.push(status);
    }

    query += `
        ORDER BY
            CASE
                WHEN due_at IS NULL THEN 1
                ELSE 0
            END,
            due_at ASC,
            created_at DESC
    `;

    const [rows] = await db.execute(query, params);

    return {
        success: true,
        tasks: rows
    };
}

module.exports = listTasks;