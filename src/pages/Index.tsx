import { useState } from 'react';
import { Mountain } from 'lucide-react';
import ChatInterface, { Message } from '@/components/ChatInterface';
import ActivityDetail from '@/components/ActivityDetail';
import { parseQuery } from '@/lib/nlp';
import { searchActivities, Activity } from '@/lib/api';
import { toast } from 'sonner';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const handleSendMessage = async (query: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Parse natural language query
      const parsed = parseQuery(query);
      
      // Show what we understood
      const understood = [];
      if (parsed.experienceType) understood.push(`Type: ${parsed.experienceType}`);
      if (parsed.neededTime) understood.push(`Duration: ${parsed.neededTime}`);
      if (parsed.difficulty) understood.push(`Difficulty: ${parsed.difficulty}`);
      if (parsed.suitableFor) understood.push(`For: ${parsed.suitableFor}`);

      if (understood.length > 0) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: `I understand you're looking for: ${understood.join(', ')}. Let me find the best options for you!`,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Search activities
      const results = await searchActivities({
        experienceType: parsed.experienceType,
        neededTime: parsed.neededTime,
        difficulty: parsed.difficulty,
        suitableFor: parsed.suitableFor,
        query,
      });

      if (results.length === 0) {
        const noResultsMessage: Message = {
          id: `assistant-${Date.now()}-no-results`,
          type: 'assistant',
          content: "I couldn't find any activities matching those criteria. Try adjusting your search or ask me for something different!",
        };
        setMessages(prev => [...prev, noResultsMessage]);
      } else {
        const activitiesMessage: Message = {
          id: `activities-${Date.now()}`,
          type: 'activities',
          activities: results,
        };
        setMessages(prev => [...prev, activitiesMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `assistant-${Date.now()}-error`,
        type: 'assistant',
        content: "Sorry, I encountered an error while searching. Please try again!",
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Search failed', {
        description: 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">SwissQuest</span>
          </div>
          <div className="text-muted-foreground text-sm">
            Powered by MySwitzerland
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onActivityClick={setSelectedActivity}
          loading={loading}
        />
      </div>

      {/* Activity Detail Modal */}
      <ActivityDetail
        activity={selectedActivity}
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
};

export default Index;
