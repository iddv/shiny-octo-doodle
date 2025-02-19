import { streamText, LangChainStream, type Message } from "ai"
import ollama from 'ollama'
import { AIMessage, HumanMessage } from "langchain/schema"

export const runtime = "edge"

export async function POST(req: Request) {
  const { messages } = await req.json()
  const { stream, handlers } = LangChainStream()

  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434", // Ollama default URL
    model: "mistral:7b",
  })

  llm.call(
    messages.map((m: Message) => (m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content))),
    {},
    [handlers],
  )

  return new streamText(stream)
}

