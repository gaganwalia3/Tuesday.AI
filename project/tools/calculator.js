function calculator(args) {
    const expression = args.expression;

    if (!expression || typeof expression !== "string") {
        throw new Error("A mathematical expression is required.");
    }

    // Allow only numbers, arithmetic operators, decimal points,
    // parentheses, spaces, and percentage symbols.
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {
        throw new Error("Invalid mathematical expression.");
    }

    try {
        const result = Function(
            `"use strict"; return (${expression})`
        )();

        if (typeof result !== "number" || !Number.isFinite(result)) {
            throw new Error("Calculation produced an invalid result.");
        }

        return {
            success: true,
            expression,
            result
        };

    } catch (error) {
        throw new Error(
            `Unable to calculate expression: ${expression}`
        );
    }
}

module.exports = calculator;