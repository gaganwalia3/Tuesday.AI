const { ChromaClient } = require("chromadb");

const client = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false
});

async function getMemoryCollection() {
    const collection = await client.getOrCreateCollection({
        name: "agentic_memory",
        embeddingFunction: null
    });

    return collection;
}

module.exports = {
    client,
    getMemoryCollection
};