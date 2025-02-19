"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useChat } from "ai/react"
import type { Theme, GameMode } from "@/types"

interface ChatInterfaceProps {
  theme: Theme
  mode: GameMode
}

export default function ChatInterface({ theme, mode }: ChatInterfaceProps) {
  const { messages, input, handleInputChange, handleSubmit } = useChat()
  const [isStreaming, setIsStreaming] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatContainerRef.current]) // Updated dependency

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsStreaming(true)

    if (mode === "streaming") {
      // Use SSE for streaming mode
      const eventSource = new EventSource(`/api/stream-adventure?theme=${theme}`)
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        // Handle streaming data
      }
      eventSource.onerror = () => {
        eventSource.close()
        setIsStreaming(false)
      }
    } else {
      // Use regular API call for non-streaming mode
      await handleSubmit(e)
      setIsStreaming(false)
    }
  }

  return (
    <div className="bg-space-dark shadow-lg rounded-lg p-4">
      <div ref={chatContainerRef} className="h-96 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`mb-2 ${message.role === "user" ? "text-right" : "text-left"}`}>
            <span
              className={`inline-block p-2 rounded-lg ${message.role === "user" ? "bg-space-primary text-white" : "bg-space-darker text-gray-200"}`}
            >
              {message.content}
            </span>
          </div>
        ))}
        {isStreaming && <div className="text-space-accent">AI is typing...</div>}
      </div>
      <form onSubmit={onSubmit} className="flex">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your action..."
          className="flex-grow mr-2 p-2 border rounded bg-space-darker text-gray-200 border-space-primary focus:outline-none focus:ring-2 focus:ring-space-accent"
        />
        <button type="submit" className="bg-space-accent text-white p-2 rounded hover:bg-opacity-80 transition-colors">
          Send
        </button>
      </form>
    </div>
  )
}

