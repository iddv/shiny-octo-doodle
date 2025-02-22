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

import { ChatOllama } from "@langchain/ollama"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import type { GameResponse } from "@/types/game"
import { ADVENTURE_PROMPT } from "@/lib/prompts/adventure"

export const runtime = "edge"

// Create a singleton chat client
let chatClient: ChatOllama | null = null;
let messageHistory: Array<HumanMessage | SystemMessage | AIMessage> = [];

// Helper function to clean and parse LLM response
async function parseGameResponse(content: string): Promise<GameResponse> {
  // Remove thinking tags and trim whitespace
  const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  
  // Find JSON content, allowing for any text before or after
  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No valid JSON found in response: ${cleanContent.substring(0, 100)}...`);
  }

  const gameResponse = JSON.parse(jsonMatch[0]);
  
  // Validate required fields
  if (!gameResponse.stats || !gameResponse.narrative || !gameResponse.choices) {
    throw new Error("Missing required fields in game response");
  }

  return gameResponse;
}

export async function POST(req: Request) {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { messages, theme, endpoint, model, isNewGame } = await req.json();
    
    // Use default values from config if not provided
    const baseUrl = endpoint || process.env.NEXT_PUBLIC_DEFAULT_ENDPOINT || "http://localhost:11434";
    const modelName = model || process.env.NEXT_PUBLIC_DEFAULT_MODEL || "deepseek-r1:32b";

    // Initialize or reset chat client if needed
    if (!chatClient || isNewGame) {
      console.log("🤖 API: Initializing streaming chat client with:", { baseUrl, modelName });
      chatClient = new ChatOllama({
        baseUrl,
        model: modelName,
        streaming: true,
      });
      
      // Reset message history for new game
      messageHistory = [
        new SystemMessage(ADVENTURE_PROMPT.replace('${theme}', theme || 'mystery')),
      ];
    }

    // Add user message to history
    const lastMessage = messages[messages.length - 1];
    messageHistory.push(new HumanMessage(lastMessage.content));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await chatClient.invoke(messageHistory);
          
          // Use the helper function to parse response
          const gameResponse = await parseGameResponse(result.content);

          // Add message history to system log
          gameResponse.systemLog = {
            ...gameResponse.systemLog,
            messageHistory: messageHistory.map(msg => ({
              role: msg instanceof SystemMessage ? 'system' : 
                    msg instanceof HumanMessage ? 'user' : 'assistant',
              content: msg.content
            }))
          };

          // Add AI response to history
          messageHistory.push(new AIMessage(gameResponse.narrative));

          // Stream the response in chunks
          const text = JSON.stringify(gameResponse);
          const chunkSize = 100;
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          controller.close();
        } catch (error) {
          console.error("❌ API: Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("❌ API: Error during streaming:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate story",
        details: error instanceof Error ? error.message : "Unknown error"
      }), 
      {
        status: 500,
        headers,
      }
    );
  }
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