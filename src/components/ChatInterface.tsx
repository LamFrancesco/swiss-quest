import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ChatMessage from './ChatMessage';
import { Activity } from '@/lib/api';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'activities' | 'understanding';
  content?: string;
  activities?: Activity[];
  filters?: {
    experienceType?: string;
    neededTime?: string;
    difficulty?: string;
    suitableFor?: string;
  };
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onActivityClick: (activity: Activity) => void;
  loading: boolean;
}

const ChatInterface = ({ messages, onSendMessage, onActivityClick, loading }: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleQuickAction = (query: string) => {
    if (!loading) {
      onSendMessage(query);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Welcome to SwissQuest! 🇨🇭</h2>
              <p className="text-muted-foreground max-w-md">
                I'm here to help you discover amazing experiences in Switzerland. Tell me what you're looking for!
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
              {[
                'Cultural activities',
                'Family-friendly adventures',
                'Mountain experiences',
                'Quick visits under 2 hours',
                'Outdoor activities',
                'Something not too difficult'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleQuickAction(suggestion)}
                  className="px-4 py-2 rounded-full bg-accent hover:bg-accent/80 text-foreground text-sm transition-all border border-border"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                type={message.type}
                content={message.content}
                activities={message.activities}
                onActivityClick={onActivityClick}
              />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
                <div className="bg-accent px-4 py-3 rounded-2xl rounded-tl-sm">
                  <p className="text-sm text-muted-foreground">Searching for perfect experiences...</p>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try: 'I want something cultural for maximum 2 hours' or 'Outdoor activity, not too difficult'"
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
export type { Message };
