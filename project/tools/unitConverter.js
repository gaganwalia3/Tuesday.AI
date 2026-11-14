function unitConverter(args) {

    const value = Number(args.value);
    const from = String(args.from || "").toLowerCase();
    const to = String(args.to || "").toLowerCase();

    if (!Number.isFinite(value)) {
        throw new Error("A valid numeric value is required.");
    }

    if (!from || !to) {
        throw new Error("Both source and target units are required.");
    }


    // ==========================================
    // LENGTH
    // ==========================================

    const lengthUnits = {
        mm: 0.001,
        millimeter: 0.001,
        millimeters: 0.001,

        cm: 0.01,
        centimeter: 0.01,
        centimeters: 0.01,

        m: 1,
        meter: 1,
        meters: 1,

        km: 1000,
        kilometer: 1000,
        kilometers: 1000,

        in: 0.0254,
        inch: 0.0254,
        inches: 0.0254,

        ft: 0.3048,
        foot: 0.3048,
        feet: 0.3048,

        yd: 0.9144,
        yard: 0.9144,
        yards: 0.9144,

        mi: 1609.344,
        mile: 1609.344,
        miles: 1609.344
    };


    if (lengthUnits[from] !== undefined &&
        lengthUnits[to] !== undefined) {

        const meters = value * lengthUnits[from];

        const result = meters / lengthUnits[to];

        return {
            success: true,
            value,
            from,
            to,
            result
        };
    }


    // ==========================================
    // WEIGHT
    // ==========================================

    const weightUnits = {

        mg: 0.001,
        milligram: 0.001,
        milligrams: 0.001,

        g: 1,
        gram: 1,
        grams: 1,

        kg: 1000,
        kilogram: 1000,
        kilograms: 1000,

        oz: 28.349523125,
        ounce: 28.349523125,
        ounces: 28.349523125,

        lb: 453.59237,
        pound: 453.59237,
        pounds: 453.59237
    };


    if (weightUnits[from] !== undefined &&
        weightUnits[to] !== undefined) {

        const grams = value * weightUnits[from];

        const result = grams / weightUnits[to];

        return {
            success: true,
            value,
            from,
            to,
            result
        };
    }


    // ==========================================
    // TEMPERATURE
    // ==========================================

    const temperatureUnits = [
        "c",
        "celsius",
        "f",
        "fahrenheit",
        "k",
        "kelvin"
    ];


    if (
        temperatureUnits.includes(from) &&
        temperatureUnits.includes(to)
    ) {

        let celsius;

        // Convert source → Celsius

        if (from === "c" || from === "celsius") {
            celsius = value;

        } else if (
            from === "f" ||
            from === "fahrenheit"
        ) {
            celsius = (value - 32) * 5 / 9;

        } else if (
            from === "k" ||
            from === "kelvin"
        ) {
            celsius = value - 273.15;
        }


        // Celsius → target

        let result;

        if (to === "c" || to === "celsius") {
            result = celsius;

        } else if (
            to === "f" ||
            to === "fahrenheit"
        ) {
            result = (celsius * 9 / 5) + 32;

        } else if (
            to === "k" ||
            to === "kelvin"
        ) {
            result = celsius + 273.15;
        }


        return {
            success: true,
            value,
            from,
            to,
            result
        };
    }


    throw new Error(
        `Unsupported unit conversion: ${from} → ${to}`
    );
}

module.exports = unitConverter;