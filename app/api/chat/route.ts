import { ChatOllama } from "@langchain/ollama"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import type { GameResponse } from "@/types/game"
import { ADVENTURE_PROMPT } from "@/lib/prompts/adventure"

export const runtime = "edge"

// Create a singleton chat client
let chatClient: ChatOllama | null = null;
let messageHistory: Array<HumanMessage | SystemMessage | AIMessage> = [];

export async function GET(req: Request) {
  console.log("🚀 Chat API: Starting chat request");
  
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  const { searchParams } = new URL(req.url);
  
  // Extract parameters with logging
  const config = {
    theme: searchParams.get("theme") || "mystery",
    endpoint: searchParams.get("endpoint") || process.env.NEXT_PUBLIC_DEFAULT_ENDPOINT || "http://localhost:11434",
    model: searchParams.get("model") || process.env.NEXT_PUBLIC_DEFAULT_MODEL || "deepseek-r1:32b",
    message: searchParams.get("message") || "Start a new adventure in this theme.",
    isNewGame: searchParams.get("newGame") === "true"
  };

  console.log("🔧 Chat API: Using configuration:", config);

  try {
    // Initialize or reset chat client if needed
    if (!chatClient || config.isNewGame) {
      console.log("🤖 Chat API: Initializing new chat client");
      chatClient = new ChatOllama({
        baseUrl: config.endpoint,
        model: config.model,
      });
      
      // Reset message history for new game
      messageHistory = [
        new SystemMessage(ADVENTURE_PROMPT.replace('${theme}', config.theme)),
      ];
    }

    // Add user message to history
    messageHistory.push(new HumanMessage(config.message));

    console.log("💭 Chat API: Invoking LLM with message history");
    const result = await chatClient.invoke(messageHistory);

    console.log("✨ API: LLM Response:", result);
    console.log("📦 API: Response content:", result.content);

    // Parse the LLM response content as JSON
    let gameResponse: GameResponse;
    try {
      // Remove any <think> tags and their content
      const cleanContent = result.content.replace(/<think>.*?<\/think>/gs, '').trim();
      
      // Try to find the JSON content
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON content found in response");
      }

      gameResponse = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!gameResponse.stats || !gameResponse.narrative || !gameResponse.choices) {
        throw new Error("Missing required fields in game response");
      }
    } catch (error) {
      console.error("❌ API: Failed to parse LLM response as JSON:", error);
      console.error("❌ API: Raw content:", result.content);
      return new Response(JSON.stringify({ 
        error: "Invalid response format",
        details: error.message,
        rawContent: result.content 
      }), {
        status: 500,
        headers,
      });
    }

    console.log("✨ API: Parsed game response:", gameResponse);

    // Add AI response to history
    messageHistory.push(new AIMessage(gameResponse.narrative));

    return new Response(JSON.stringify(gameResponse), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("❌ API: Error during LLM interaction:", error);
    return new Response(JSON.stringify({ error: "Failed to generate story" }), {
      status: 500,
      headers,
    });
  }
}
