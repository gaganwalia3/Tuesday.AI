const {
    createPendingAction,
    getPendingAction,
    deletePendingAction
} = require("./agent/pendingActions");

console.log("\n🧪 Testing confirmation system...\n");


// ==========================================
// CREATE PENDING ACTION
// ==========================================

const confirmationId =
    createPendingAction({

        messages: [
            {
                role: "user",
                content: "Delete my test task"
            }
        ],

        contents: [],

        state: {
            status: "waiting_for_confirmation"
        },

        tool: "deleteTask",

        arguments: {
            id: 999999
        }

    });


console.log(
    "🆔 Created confirmation:"
);

console.log(
    confirmationId
);


// ==========================================
// RETRIEVE
// ==========================================

const pending =
    getPendingAction(
        confirmationId
    );


console.log(
    "\n📦 Retrieved confirmation:"
);

console.log(
    JSON.stringify(
        pending,
        null,
        2
    )
);


// ==========================================
// DELETE
// ==========================================

deletePendingAction(
    confirmationId
);


// ==========================================
// VERIFY
// ==========================================

const afterDelete =
    getPendingAction(
        confirmationId
    );


console.log(
    "\n🗑️ After deletion:"
);

console.log(
    afterDelete
);


console.log(
    "\n✅ Confirmation infrastructure test complete."
);