const { chunkText } = require("./chunker");

const text = `
Nexus AI is a personal agentic AI assistant.
It uses Gemini as the language model.
The backend is built using Node.js and Express.
The frontend is built using React and Vite.
MySQL stores structured application data.
Chroma stores embeddings and performs semantic search.
Tavily provides web search capabilities.
The memory system uses MySQL as the source of truth.
Semantic memory uses embeddings and vector search.
RAG allows Nexus AI to retrieve information from external documents.
`;

const chunks = chunkText(text, 200, 50);

console.log("Number of chunks:", chunks.length);

chunks.forEach((chunk, index) => {
    console.log(`\n--- Chunk ${index + 1} ---`);
    console.log(chunk);
});