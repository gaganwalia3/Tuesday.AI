
const { tavily } = require("@tavily/core");

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY
});

async function searchWeb(args) {
    // Groq tool calls provide an object: { query: "..." }
    // Also support direct string calls for compatibility.
    const query =
        typeof args === "string"
            ? args
            : args?.query;

    if (typeof query !== "string" || !query.trim()) {
        throw new Error(
            "searchWeb requires a non-empty query string."
        );
    }
console.log("🔍 TAVILY DEBUG:", {
    receivedArgs: args,
    extractedQuery: query,
    queryType: typeof query
});
    const response = await tvly.search(query.trim(), {
        searchDepth: "basic",
        maxResults: 5
    });

    return response.results;
}

module.exports = searchWeb;
