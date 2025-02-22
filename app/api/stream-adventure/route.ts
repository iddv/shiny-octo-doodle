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
  console.log("🧹 API: Raw content:", content);
  
  try {
    // First, try to find any JSON-like structure
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ API: No JSON structure found in content");
      throw new Error("No JSON content found in response");
    }

    // Extract the JSON part and parse it
    let jsonContent = jsonMatch[0];
    
    // Remove any think tags and their content that might be inside the JSON
    jsonContent = jsonContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove complete think blocks
      .replace(/<think>/g, '')                    // Remove any orphaned opening tags
      .replace(/<\/think>/g, '')                  // Remove any orphaned closing tags
      .trim();

    // Clean up any potential double-encoded content
    jsonContent = jsonContent
      .replace(/\\<think\\>[\s\S]*?\\<\/think\\>/g, '')
      .replace(/\\<think\\>/g, '')
      .replace(/\\<\/think\\>/g, '');

    console.log("🧹 API: Cleaned JSON content:", jsonContent);

    const gameResponse = JSON.parse(jsonContent);
    
    // Validate required fields
    if (!gameResponse.stats || !gameResponse.narrative || !gameResponse.choices) {
      throw new Error("Missing required fields in game response");
    }

    // Ensure all required fields exist with defaults if needed
    return {
      stats: {
        health: gameResponse.stats.health ?? 100,
        maxHealth: gameResponse.stats.maxHealth ?? 100,
        gold: gameResponse.stats.gold ?? 0,
        inventory: gameResponse.stats.inventory ?? []
      },
      narrative: gameResponse.narrative,
      storySoFar: gameResponse.storySoFar || gameResponse.narrative,
      systemLog: {
        decisions: gameResponse.systemLog?.decisions ?? [],
        worldState: {
          alliances: gameResponse.systemLog?.worldState?.alliances ?? {},
          deadNPCs: gameResponse.systemLog?.worldState?.deadNPCs ?? [],
          unlockedLocations: gameResponse.systemLog?.worldState?.unlockedLocations ?? [],
          activeQuests: gameResponse.systemLog?.worldState?.activeQuests ?? [],
          completedQuests: gameResponse.systemLog?.worldState?.completedQuests ?? [],
          reputation: gameResponse.systemLog?.worldState?.reputation ?? {}
        },
        gameState: {
          currentPhase: gameResponse.systemLog?.gameState?.currentPhase ?? 'DISASTER',
          daysSurvived: gameResponse.systemLog?.gameState?.daysSurvived ?? 0,
          difficulty: gameResponse.systemLog?.gameState?.difficulty ?? 'MEDIUM'
        },
        messageHistory: gameResponse.systemLog?.messageHistory ?? []
      },
      changes: {
        healthChange: gameResponse.changes?.healthChange ?? null,
        goldChange: gameResponse.changes?.goldChange ?? null,
        itemsAdded: gameResponse.changes?.itemsAdded ?? null,
        itemsRemoved: gameResponse.changes?.itemsRemoved ?? null
      },
      choices: gameResponse.choices
    };
  } catch (error) {
    console.error("❌ API: Failed to parse game response:", error);
    console.error("❌ API: Raw content was:", content);
    throw new Error(`Failed to parse game response: ${error.message}`);
  }
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
    
    // Use provided values or fallback to defaults
    const baseUrl = endpoint || process.env.NEXT_PUBLIC_DEFAULT_ENDPOINT || "http://localhost:11434";
    const modelName = model || process.env.NEXT_PUBLIC_DEFAULT_MODEL || "deepseek-r1:32b";

    console.log("🔧 Stream API: Using configuration:", { baseUrl, modelName, isNewGame });

    // Initialize or reset chat client if needed
    if (!chatClient || isNewGame) {
      console.log("🤖 Stream API: Initializing new chat client");
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

    // Add user message to history if it exists
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.content) {
      messageHistory.push(new HumanMessage(lastMessage.content));
    }

    console.log("💭 API: Sending messages to LLM:", messageHistory.map(m => ({
      role: m instanceof SystemMessage ? 'system' : 
            m instanceof HumanMessage ? 'user' : 'assistant',
      content: m.content.substring(0, 100) + '...' // Truncate for logging
    })));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await chatClient.invoke(messageHistory);
          console.log("🎯 API: Raw LLM response:", result.content);
          
          // Use the helper function to parse response
          const gameResponse = await parseGameResponse(result.content);
          console.log("✨ API: Parsed game response:", gameResponse);

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