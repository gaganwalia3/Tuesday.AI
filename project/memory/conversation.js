const db = require("./database");


// ==========================================
// CREATE CONVERSATION
// ==========================================

async function createConversation(title = "New Chat") {

    const [result] = await db.execute(
        `INSERT INTO conversations (title)
         VALUES (?)`,
        [title]
    );

    return result.insertId;
}


// ==========================================
// UPDATE CONVERSATION TITLE
// ==========================================

async function updateConversationTitle(
    conversationId,
    title
) {

    await db.execute(
        `UPDATE conversations
         SET title = ?
         WHERE id = ?`,
        [
            title,
            conversationId
        ]
    );

}


// ==========================================
// SAVE MESSAGE
// ==========================================

async function saveMessage(
    conversationId,
    role,
    content
) {

    await db.execute(
        `INSERT INTO messages
        (conversation_id, role, content)
        VALUES (?, ?, ?)`,
        [
            conversationId,
            role,
            content
        ]
    );

}


// ==========================================
// GET MESSAGES
// ==========================================

async function getMessages(conversationId) {

    const [rows] = await db.execute(
        `SELECT role, content
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC, id ASC`,
        [conversationId]
    );

    return rows;

}


// ==========================================
// GET ALL CONVERSATIONS
// ==========================================

async function getConversations() {

    const [rows] = await db.execute(
        `SELECT id, title, created_at, updated_at
         FROM conversations
         ORDER BY updated_at DESC`
    );

    return rows;

}


// ==========================================
// DELETE CONVERSATION
// Removes the chat's messages first, then the chat itself,
// in one transaction so nothing is left half-deleted.
// ==========================================

async function deleteConversation(conversationId) {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        await connection.execute(
            `DELETE FROM messages
             WHERE conversation_id = ?`,
            [conversationId]
        );

        const [result] = await connection.execute(
            `DELETE FROM conversations
             WHERE id = ?`,
            [conversationId]
        );

        await connection.commit();

        return result.affectedRows > 0;

    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        connection.release();

    }

}


module.exports = {

    createConversation,
    updateConversationTitle,
    saveMessage,
    getMessages,
    getConversations,
    deleteConversation

};