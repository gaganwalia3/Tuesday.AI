const getCurrentTime = require("./getCurrentTime");
const searchWeb = require("./searchWeb");
const saveMemory = require("./saveMemory");
const searchMemory = require("./searchMemory");

const updateMemory = require("./updateMemory");
const deleteMemory = require("./deleteMemory");

const calculator = require("./calculator");
const unitConverter = require("./unitConverter");
const dateTime = require("./dateTime");

const createTask = require("./createTask");
const listTasks = require("./listTasks");
const updateTask = require("./updateTask");
const completeTask = require("./completeTask");
const deleteTask = require("./deleteTask");


// ==========================================
// TOOL REGISTRY
// ==========================================
//
// category:
//     read         → retrieves/calculates information
//     write        → creates/modifies information
//     destructive  → permanently changes/removes
//
// requiresConfirmation:
//     false → can execute automatically
//     true  → user approval required
//
// ==========================================

const tools = {

    // =========================================================
    // TIME
    // =========================================================

    getCurrentTime: {

        description:
            "Returns the current local date and time. " +
            "Use this when the user asks for the current time, " +
            "current date, or information dependent on the current moment.",

        category: "read",

        parameters: {
            type: "OBJECT",

            properties: {}
        },

        requiresConfirmation: false,

        execute: getCurrentTime
    },


    dateTime: {

        description:
            "Performs deterministic date and time calculations. " +
            "Use this for the current date/time, adding or subtracting " +
            "durations, or calculating the difference between dates. " +
            "Do not estimate dates when this tool can calculate them.",

        category: "read",

        parameters: {

            type: "OBJECT",

            properties: {

                operation: {
                    type: "STRING",
                    description:
                        "Operation: now, add, subtract, or difference."
                },

                value: {
                    type: "NUMBER",
                    description:
                        "Amount of time to add or subtract."
                },

                unit: {
                    type: "STRING",
                    description:
                        "Unit: seconds, minutes, hours, days, or weeks."
                },

                from: {
                    type: "STRING",
                    description:
                        "Starting date/time in ISO 8601 format."
                },

                to: {
                    type: "STRING",
                    description:
                        "Ending date/time in ISO 8601 format."
                }
            },

            required: ["operation"]
        },

        requiresConfirmation: false,

        execute: dateTime
    },


    // =========================================================
    // WEB
    // =========================================================

    searchWeb: {

        description:
            "Searches the internet for current, recent, changing, " +
            "or externally verifiable information. " +
            "Use this for latest news, current events, current prices, " +
            "recent announcements, current software versions, " +
            "or information that may have changed. " +
            "Do not use this to retrieve the user's stored memories.",

        category: "read",

        parameters: {

            type: "OBJECT",

            properties: {

                query: {
                    type: "STRING",
                    description:
                        "A concise search query describing the information " +
                        "that should be found on the internet."
                }
            },

            required: ["query"]
        },

        requiresConfirmation: false,

        execute: searchWeb
    },


    // =========================================================
    // MEMORY
    // =========================================================

    saveMemory: {

        description:
            "Stores important information in the user's long-term memory. " +
            "Use this when the user explicitly asks Nexus to remember something " +
            "or when information is clearly useful as persistent personal or " +
            "project context. Do not save ordinary temporary conversation.",

        category: "write",

        parameters: {

            type: "OBJECT",

            properties: {

                content: {
                    type: "STRING",
                    description:
                        "The specific personal, preference, project, " +
                        "or other long-term information to remember."
                }
            },

            required: ["content"]
        },

        requiresConfirmation: false,

        execute: saveMemory
    },


    searchMemory: {

        description:
            "Searches the user's stored long-term memories using semantic search. " +
            "Use this for previously remembered personal information, " +
            "preferences, projects, and persistent context. " +
            "Do not use this for current internet information.",

        category: "read",

        parameters: {

            type: "OBJECT",

            properties: {

                query: {
                    type: "STRING",
                    description:
                        "A concise description of the personal, project, " +
                        "or previously remembered information to retrieve."
                }
            },

            required: ["query"]
        },

        requiresConfirmation: false,

        execute: searchMemory
    },


    updateMemory: {

        description:
            "Updates an existing piece of information in the user's long-term memory. " +
            "Use this when a remembered fact has changed or needs correction. " +
            "The memory ID must come from previously retrieved memory information.",

        category: "write",

        parameters: {

            type: "OBJECT",

            properties: {

                id: {
                    type: "NUMBER",
                    description:
                        "The ID of the existing memory to update."
                },

                content: {
                    type: "STRING",
                    description:
                        "The corrected or updated information."
                }
            },

            required: ["id", "content"]
        },

        requiresConfirmation: true,

        execute: updateMemory
    },


    deleteMemory: {

        description:
            "Permanently deletes information from the user's long-term memory. " +
            "Use this only when the user explicitly asks Nexus to forget or remove " +
            "stored information. The memory ID must come from retrieved memory.",

        category: "destructive",

        parameters: {

            type: "OBJECT",

            properties: {

                id: {
                    type: "NUMBER",
                    description:
                        "The ID of the memory to permanently delete."
                }
            },

            required: ["id"]
        },

        requiresConfirmation: true,

        execute: deleteMemory
    },


    // =========================================================
    // CALCULATOR
    // =========================================================

    calculator: {

        description:
            "Performs accurate mathematical calculations. " +
            "Use this for arithmetic, percentages, formulas, " +
            "and numerical expressions instead of estimating.",

        category: "read",

        parameters: {

            type: "OBJECT",

            properties: {

                expression: {
                    type: "STRING",
                    description:
                        "A mathematical expression such as " +
                        "25 * 4, (100 + 50) / 3, or 15% * 200."
                }
            },

            required: ["expression"]
        },

        requiresConfirmation: false,

        execute: calculator
    },


    // =========================================================
    // UNIT CONVERTER
    // =========================================================

    unitConverter: {

        description:
            "Converts values between supported units of length, " +
            "weight, and temperature.",

        category: "read",

        parameters: {

            type: "OBJECT",

            properties: {

                value: {
                    type: "NUMBER",
                    description:
                        "The numeric value to convert."
                },

                from: {
                    type: "STRING",
                    description:
                        "The original unit."
                },

                to: {
                    type: "STRING",
                    description:
                        "The target unit."
                }
            },

            required: ["value", "from", "to"]
        },

        requiresConfirmation: false,

        execute: unitConverter
    },


    // =========================================================
    // TASKS
    // =========================================================

    createTask: {

        description:
            "Creates a persistent task for the user. " +
            "Use this when the user asks Nexus to create or add a task " +
            "that should be tracked.",

        category: "write",

        parameters: {

            type: "OBJECT",

            properties: {

                title: {
                    type: "STRING",
                    description:
                        "A short, clear task title."
                },

                description: {
                    type: "STRING",
                    description:
                        "Optional details about the task."
                },

                dueAt: {
                    type: "STRING",
                    description:
                        "Optional due date/time in YYYY-MM-DD HH:MM:SS format."
                }
            },

            required: ["title"]
        },

        requiresConfirmation: false,

        execute: createTask
    },


    listTasks: {

        description:
            "Retrieves the user's persistent tasks. " +
            "Use this when the user asks what tasks they have, " +
            "what is pending, or what has been completed.",

        category: "read",

        parameters: {

            type: "OBJECT",

            properties: {

                status: {
                    type: "STRING",
                    description:
                        "Task status: pending, completed, or all."
                }
            }
        },

        requiresConfirmation: false,

        execute: listTasks
    },


    updateTask: {

        description:
            "Updates an existing task. " +
            "Use this when the user wants to change a task's title, " +
            "description, or due date. The task ID must be known.",

        category: "write",

        parameters: {

            type: "OBJECT",

            properties: {

                id: {
                    type: "NUMBER",
                    description:
                        "The ID of the task to update."
                },

                title: {
                    type: "STRING",
                    description:
                        "The new task title."
                },

                description: {
                    type: "STRING",
                    description:
                        "The new task description."
                },

                dueAt: {
                    type: "STRING",
                    description:
                        "The new due date/time."
                }
            },

            required: ["id"]
        },

        requiresConfirmation: false,

        execute: updateTask
    },


    completeTask: {

        description:
            "Marks an existing task as completed. " +
            "Use this when the user says they finished a task.",

        category: "write",

        parameters: {

            type: "OBJECT",

            properties: {

                id: {
                    type: "NUMBER",
                    description:
                        "The ID of the task to complete."
                }
            },

            required: ["id"]
        },

        requiresConfirmation: false,

        execute: completeTask
    },


    deleteTask: {

        description:
            "Permanently deletes an existing task. " +
            "Use this only when the user explicitly asks to delete a task.",

        category: "destructive",

        parameters: {

            type: "OBJECT",

            properties: {

                id: {
                    type: "NUMBER",
                    description:
                        "The ID of the task to delete."
                }
            },

            required: ["id"]
        },

        requiresConfirmation: true,

        execute: deleteTask
    }

};


module.exports = tools;