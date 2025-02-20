"use client"
import { useState, useEffect, useRef } from "react"
import { useChat } from "ai/react"
import type { Theme, GameMode } from "@/types"

interface ChatInterfaceProps {
  theme: Theme
  mode: GameMode
}

export default function ChatInterface({ theme, mode }: ChatInterfaceProps) {
  const [streamingContent, setStreamingContent] = useState("");
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/stream-adventure', // Your API endpoint
    onResponse: (response) => {
      if (!response.ok) {
        console.error('Chat response error:', response.statusText);
        return;
      }

      // Handle the streaming response
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        const readChunk = async () => {
          const { done, value } = await reader.read();
          if (done) {
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          setStreamingContent(prev => prev + chunk);
          readChunk();
        };
        readChunk();
      }
    },
    onFinish: () => {
      setIsStreaming(false);
      setStreamingContent("");
    },
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]); // Changed dependency to messages

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsStreaming(true);
    try {
      await handleSubmit(e);
    } catch (error) {
      console.error('Chat submission error:', error);
      setIsStreaming(false);
    }
  };

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
        {isStreaming && (
          <div className="text-left">
            <span className="inline-block p-2 rounded-lg bg-space-darker text-gray-200">
              {streamingContent}
            </span>
          </div>
        )}
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

