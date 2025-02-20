// import { LangChainStream, streamText, type Message } from "ai/langchain/
// import { ChatOllama } from "@langchain/community/chat_models/ollama"
// import { AIMessage, HumanMessage } from "@langchain/core/messages"

// export const runtime = "edge"

// export async function POST(req: Request) {
//   const { messages } = await req.json()
//   const { stream, handlers } = LangChainStream()

//   const llm = new ChatOllama({
//     baseUrl: "http://localhost:11434", // Ollama default URL
//     model: "mistral:7b",
//   })

//   llm.call(
//     messages.map((m: Message) =>
//       m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
//     ),
//     {},
//     [handlers],
//   )

//   return streamText.toDataStreamResponse(stream)
// }

import { ChatOllama } from "@langchain/ollama";

export async function POST(req: Request) {
  // Set CORS headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*", // adjust as needed
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const { messages } = await req.json();

  // Create the ChatOllama instance.
  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434", // Ollama default URL
    model: "deepseek-r1:14b",
    streaming: true, // streaming enabled, though invoke won't stream
  });

  const encoder = new TextEncoder();

  // Use llm.invoke to get the full response, then split it into chunks.
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // llm.invoke returns the full AIMessage.
        const fullResponse = await llm.invoke(messages);
        const text = Array.isArray(fullResponse.content) ? fullResponse.content.join(' ') : fullResponse.content || "";

        // Choose a chunk size (e.g. 20 characters per chunk)
        const chunkSize = 20;
        for (let i = 0; i < text.length; i += chunkSize) {
          const chunk = text.slice(i, i + chunkSize);
          controller.enqueue(encoder.encode(chunk));
          // Optionally simulate a slight delay between chunks
          await new Promise((res) => setTimeout(res, 10));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, { headers });
}





// import { streamText } from 'ai';
// import { ChatOllama } from "@langchain/ollama"

// export async function POST(req: Request) {
//   // Set CORS headers
//   const headers = new Headers({
//     'Access-Control-Allow-Origin': '*', // Replace with your frontend URL
//     'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//     'Access-Control-Allow-Headers': 'Content-Type',
//   });

//   // Handle preflight request
//   if (req.method === 'OPTIONS') {
//     return new Response(null, {
//       status: 204,
//       headers,
//     });
//   }

//   const { messages } = await req.json();

//   const llm = new ChatOllama({
//     baseUrl: "http://localhost:11434", // Ollama default URL
//     model: "mistral:7b",
//   });

//   const result = await llm.invoke(messages);

//   console.log(result);
//   // Return the response with CORS headers
//   return new Response(JSON.stringify(result), {
//     status: 200,
//     headers,
//   });
// }