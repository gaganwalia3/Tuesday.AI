function chunkText(text, chunkSize = 500, overlapSentences = 1) {
    if (!text || typeof text !== "string") {
        throw new Error("Text must be a non-empty string.");
    }

    // Normalize whitespace only.
    const cleanedText = text
        .replace(/\r?\n/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim();

    // Split into sentences.
    const sentences =
        cleanedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];

    const cleanSentences = sentences
        .map(sentence => sentence.trim())
        .filter(Boolean);

    const chunks = [];

    let start = 0;

    while (start < cleanSentences.length) {

        let end = start;
        let length = 0;

        // Build one chunk.
        while (end < cleanSentences.length) {

            const sentence = cleanSentences[end];

            const extra =
                length === 0
                    ? sentence.length
                    : sentence.length + 1;

            if (length + extra > chunkSize && end > start) {
                break;
            }

            length += extra;
            end++;
        }

        const chunk = cleanSentences
            .slice(start, end)
            .join(" ");

        chunks.push(chunk);

        // Move forward, keeping only the requested
        // number of complete sentences as overlap.
        start = Math.max(end - overlapSentences, start + 1);
    }

    return chunks;
}

module.exports = {
    chunkText
};