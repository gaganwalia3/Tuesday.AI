function dateTime(args) {

    const operation = args.operation;
    const value = args.value;
    const unit = args.unit;

    const now = new Date();

    // ==========================================
    // CURRENT TIME
    // ==========================================

    if (operation === "now") {

        return {
            success: true,
            iso: now.toISOString(),
            local: now.toString(),
            timestamp: now.getTime()
        };
    }


    // ==========================================
    // ADD / SUBTRACT TIME
    // ==========================================

    if (
        operation === "add" ||
        operation === "subtract"
    ) {

        if (!Number.isFinite(Number(value))) {
            throw new Error("A valid numeric value is required.");
        }

        const amount = Number(value);

        const multipliers = {
            seconds: 1000,
            minutes: 60 * 1000,
            hours: 60 * 60 * 1000,
            days: 24 * 60 * 60 * 1000,
            weeks: 7 * 24 * 60 * 60 * 1000
        };

        if (!multipliers[unit]) {
            throw new Error(
                "Supported units: seconds, minutes, hours, days, weeks."
            );
        }

        const difference =
            amount * multipliers[unit];

        const result = new Date(
            operation === "add"
                ? now.getTime() + difference
                : now.getTime() - difference
        );

        return {
            success: true,
            operation,
            value: amount,
            unit,
            from: now.toISOString(),
            result: result.toISOString()
        };
    }


    // ==========================================
    // DIFFERENCE BETWEEN TWO DATES
    // ==========================================

    if (operation === "difference") {

        if (!args.from || !args.to) {
            throw new Error(
                "Both from and to dates are required."
            );
        }

        const from = new Date(args.from);
        const to = new Date(args.to);

        if (
            Number.isNaN(from.getTime()) ||
            Number.isNaN(to.getTime())
        ) {
            throw new Error("Invalid date provided.");
        }

        const difference =
            Math.abs(to.getTime() - from.getTime());

        return {
            success: true,
            from: from.toISOString(),
            to: to.toISOString(),

            milliseconds: difference,

            seconds: difference / 1000,

            minutes: difference / (60 * 1000),

            hours: difference / (60 * 60 * 1000),

            days: difference / (24 * 60 * 60 * 1000)
        };
    }


    throw new Error(
        "Unsupported dateTime operation."
    );
}

module.exports = dateTime;