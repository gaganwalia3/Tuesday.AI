function createAgentState(messages) {

    return {
        // ==========================================
        // USER / CONVERSATION
        // ==========================================

        userGoal: null,

        messages: [...messages],


        // ==========================================
        // EXECUTION
        // ==========================================

        iteration: 0,

        maxIterations: 8,

        status: "running",


        // ==========================================
        // TOOL EXECUTION
        // ==========================================

        toolHistory: [],

        currentTool: null,


        // ==========================================
        // RESULTS
        // ==========================================

        results: [],


        // ==========================================
        // ERRORS
        // ==========================================

        errors: [],


        // ==========================================
        // CONFIRMATION
        // ==========================================

        pendingConfirmation: null
    };
}


function recordToolExecution(
    state,
    {
        tool,
        arguments: args,
        result,
        success
    }
) {

    const execution = {
        tool,
        arguments: args,
        result,
        success,
        timestamp: new Date().toISOString()
    };

    state.toolHistory.push(execution);

    state.results.push(result);

    if (!success) {
        state.errors.push({
            tool,
            error: result?.error || "Unknown tool error",
            timestamp: execution.timestamp
        });
    }

    state.currentTool = null;
}


function requestConfirmation(
    state,
    {
        tool,
        arguments: args
    }
) {

    state.pendingConfirmation = {
        tool,
        arguments: args,
        createdAt: new Date().toISOString()
    };

    state.status = "waiting_for_confirmation";
}


function clearConfirmation(state) {

    state.pendingConfirmation = null;

    if (state.status === "waiting_for_confirmation") {
        state.status = "running";
    }
}


module.exports = {
    createAgentState,
    recordToolExecution,
    requestConfirmation,
    clearConfirmation
};