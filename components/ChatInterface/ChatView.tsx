import { RefObject, ChangeEvent, FormEvent } from 'react';
import type { GameResponse } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatViewProps {
  gameState: GameResponse | null;
  completedMessages: Message[];
  isStreaming: boolean;
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  chatContainerRef: RefObject<HTMLDivElement>;
}

export function ChatView({
  gameState,
  completedMessages,
  isStreaming,
  input,
  handleInputChange,
  handleSubmit,
  chatContainerRef
}: ChatViewProps) {
  return (
    <div className="bg-space-dark shadow-lg rounded-lg p-4">
      {/* Game Stats Display */}
      {gameState?.stats && (
        <div className="mb-4 p-4 bg-space-darker rounded-lg">
          <h3 className="text-space-accent font-bold mb-2">Game Stats</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>❤️ Health: {gameState.stats.health}/{gameState.stats.maxHealth || 100}</div>
            <div>💰 Gold: {gameState.stats.gold || 0}</div>
            <div className="col-span-2">
              🎒 Inventory: {gameState.stats.inventory?.join(', ') || 'Empty'}
            </div>
          </div>
        </div>
      )}

      {/* Adventure story output */}
      <div className="mb-4">
        <h3 className="text-space-accent font-bold mb-2">Current Adventure</h3>
        <textarea
          value={gameState?.narrative || "Your adventure is about to begin..."}
          readOnly
          className="w-full p-2 border rounded bg-space-darker text-gray-200 border-space-primary focus:outline-none min-h-[80px] resize-none opacity-90 cursor-default"
          rows={3}
        />
      </div>

      {/* Chat messages */}
      <div 
        ref={chatContainerRef} 
        className="h-96 overflow-y-auto mb-4 space-y-4 p-2"
      >
        {completedMessages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-space-primary text-white ml-4' 
                  : 'bg-space-darker text-gray-200 mr-4'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Type your action..."
          disabled={isStreaming}
          className="flex-grow mr-2 p-2 border rounded bg-space-darker text-gray-200 border-space-primary focus:outline-none focus:ring-2 focus:ring-space-accent min-h-[80px] resize-y w-full disabled:opacity-50"
          rows={3}
        />
        <button 
          type="submit" 
          disabled={isStreaming || !input.trim()}
          className="bg-space-accent text-white p-2 rounded hover:bg-opacity-80 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStreaming ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
} 