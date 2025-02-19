import { StreamingTextResponse, LangChainStream } from "ai"
import { ChatOllama } from "langchain/chat_models/ollama"
import { HumanMessage, SystemMessage } from "langchain/schema"

export const runtime = "edge"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const theme = searchParams.get("theme")

  const { stream, handlers } = LangChainStream()

  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434", // Ollama default URL
    model: "deepseek-r1:14b",
  })

  llm.call(
    [
      new SystemMessage(`You are narrating a ${theme} adventure.`),
      new HumanMessage("Start a new adventure in this theme."),
    ],
    {},
    [handlers],
  )

  return new StreamingTextResponse(stream)
}

