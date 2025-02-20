"use client"
import { useState, useEffect, useRef } from "react"
import { useChat } from "ai/react"
import type { Theme, GameMode } from "@/types"

interface ChatInterfaceProps {
  theme: Theme
  mode: GameMode
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/**
 * ChatInterface component for rendering a chat interface with streaming capabilities.
 * 
 * This component handles the display of chat messages, streaming of incoming messages,
 * and user input for sending new messages. It uses the useChat hook for managing
 * chat state and communication with the server.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {Theme} props.theme - The current theme of the application.
 * @param {GameMode} props.mode - The current game mode.
 * @returns {JSX.Element} A React component that renders the chat interface.
 */
export default function ChatInterface({ theme, mode }: ChatInterfaceProps) {
  const [completedMessages, setCompletedMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const streamingContentRef = useRef("");
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/stream-adventure',
    onResponse: (response) => {
      if (!response.ok) {
        console.error('Chat response error:', response.statusText);
        return;
      }
      console.log(response.status);

      setIsStreaming(true);
      setStreamingContent(""); // Reset streaming content
      streamingContentRef.current = ""; // Reset the ref as well
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        const readChunk = async () => {
          const { done, value } = await reader.read();
          if (done) {
            setIsStreaming(false);
            // console.log("Adding assistant message:", streamingContentRef.current);
            setCompletedMessages(prev => {
              console.log("Prev:", prev);
              const newMessages = [...prev, {
                id: Date.now().toString(),
                role: 'assistant' as const,
                content: streamingContentRef.current
              }];
              console.log("Updated completedMessages:", newMessages);
              return newMessages;
            });
            setStreamingContent(""); // Reset streaming content after moving it to completedMessages
            streamingContentRef.current = ""; // Reset the ref as well
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          streamingContentRef.current += chunk; // Update the ref
          setStreamingContent(streamingContentRef.current); // Update the state
          readChunk();
        };
        readChunk();
      }
    },
    onFinish: () => {
      setIsStreaming(false);
      // Ensure any remaining streaming content is moved to completedMessages
      if (streamingContentRef.current) {
        console.log("onFinish: Adding assistant message:", streamingContentRef.current);
        setCompletedMessages(prev => {
          const newMessages = [...prev, {
            id: Date.now().toString(),
            role: 'assistant' as const,
            content: streamingContentRef.current
          }];
          console.log("onFinish: Updated completedMessages:", newMessages);
          return newMessages;
        });
      }
      setStreamingContent(""); // Reset streaming content after moving it to completedMessages
      streamingContentRef.current = ""; // Reset the ref as well
    },
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [completedMessages, streamingContent]);
useEffect(() => {
  console.log("useChat messages:", messages);
}, [messages]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Add user message to completedMessages
      console.log("Adding User Message to Completed Messages", input);
      setCompletedMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: input
      }]);
      await handleSubmit(e);
    } catch (error) {
      console.error('Chat submission error:', error);
      setIsStreaming(false);
    }
  };

  return (
    <div className="bg-space-dark shadow-lg rounded-lg p-4">
      <div ref={chatContainerRef} className="h-96 overflow-y-auto mb-4 space-y-4">
        {completedMessages.length === 0 && <div>No messages yet</div>}
        {completedMessages.map((message) => (
          <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${
              message.role === 'user' ? 'bg-space-primary text-white' : 'bg-space-darker text-gray-200'
            }`}>
              [{message.role}]: {message.content || 'Empty message'}
            </span>
          </div>
        ))}
        {streamingContent && (
          <div className="text-left mb-2">
            <span className="inline-block p-2 rounded-lg bg-space-darker text-gray-200">
              [Streaming]: {streamingContent}
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
