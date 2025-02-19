import { ChatOllama } from "@langchain/ollama"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

export const runtime = "edge"

export async function GET(req: Request) {
  // Set CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*', // Replace with your frontend URL
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  const { searchParams } = new URL(req.url)
  const theme = searchParams.get("theme") || "mystery"

  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434", // Ollama default URL
    model: "deepseek-r1:14b",
  })

  const result = await llm.invoke([
    new SystemMessage(`You are narrating a ${theme} adventure.`),
    new HumanMessage("Start a new adventure in this theme."),
  ])

  // Return the response with CORS headers
  return new Response(JSON.stringify(result), {
    status: 200,
    headers,
  })
}
