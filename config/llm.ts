export interface LLMConfig {
  endpoint: string
  model: string
}

export interface LLMOptions {
  endpoints: string[]
  models: string[]
  defaultEndpoint?: string
  defaultModel?: string
}

export const llmOptions: LLMOptions = {
  endpoints: [
    "http://localhost:11434",
    "http://172.21.192.1:11434"
  ],
  models: [
    "deepseek-r1:32b",
    "mistral:7b",
    "llama2:13b"
  ],
  defaultEndpoint: process.env.NEXT_PUBLIC_DEFAULT_ENDPOINT || "http://localhost:11434",
  defaultModel: process.env.NEXT_PUBLIC_DEFAULT_MODEL || "deepseek-r1:32b"
} 