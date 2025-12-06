import { useState } from 'react';
import { Mountain, BarChart, GitCompare } from 'lucide-react';
import ChatInterface, { Message } from '@/components/ChatInterface';
import ActivityDetail from '@/components/ActivityDetail';
import { parseQuery } from '@/lib/nlp';
import { searchActivities, Activity } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { runFullEvaluation } from '@/lib/metrics';
import { runModelComparison } from '@/lib/metricsComparison';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [comparing, setComparing] = useState(false);

  const handleRunComparison = async () => {
    setComparing(true);
    toast.info("Starting model comparison...", {
      description: "Comparing Fuzzy Logic vs LLM - check console for results"
    });
    
    try {
      const report = await runModelComparison();
      toast.success("Comparison complete!", {
        description: `Fuzzy: P=${(report.fuzzyAverages.avgPrecision * 100).toFixed(0)}% R=${(report.fuzzyAverages.avgRecall * 100).toFixed(0)}% | LLM: P=${(report.llmAverages.avgPrecision * 100).toFixed(0)}% R=${(report.llmAverages.avgRecall * 100).toFixed(0)}%`
      });
    } catch (error) {
      console.error("Comparison failed:", error);
      toast.error("Comparison failed", {
        description: "Check the console for error details"
      });
    } finally {
      setComparing(false);
    }
  };

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    toast.info("Starting metrics evaluation...", {
      description: "Check the browser console for detailed results"
    });
    
    try {
      const report = await runFullEvaluation();
      toast.success("Evaluation complete!", {
        description: `Avg Precision: ${(report.averages.avgPrecision * 100).toFixed(1)}%, Avg Recall: ${(report.averages.avgRecall * 100).toFixed(1)}%`
      });
    } catch (error) {
      console.error("Evaluation failed:", error);
      toast.error("Evaluation failed", {
        description: "Check the console for error details"
      });
    } finally {
      setEvaluating(false);
    }
  };

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
      
      // Always show what we understood with filters
      if (parsed.experienceType || parsed.neededTime || parsed.difficulty || parsed.suitableFor) {
        const understandingMessage: Message = {
          id: `understanding-${Date.now()}`,
          type: 'understanding',
          filters: {
            experienceType: parsed.experienceType,
            neededTime: parsed.neededTime,
            difficulty: parsed.difficulty,
            suitableFor: parsed.suitableFor,
          },
        };
        setMessages(prev => [...prev, understandingMessage]);
      }

      // Search activities
      const results = await searchActivities({
        experienceType: parsed.experienceType,
        neededTime: parsed.neededTime,
        difficulty: parsed.difficulty,
        suitableFor: parsed.suitableFor,
        query,
      });

      // Limit results to 5-7 activities
      const limitedResults = results.slice(0, 7);

      if (limitedResults.length === 0) {
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
          activities: limitedResults,
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
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleRunComparison}
              disabled={comparing || evaluating}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <GitCompare className="h-4 w-4" />
              {comparing ? "Comparing..." : "Compare Models"}
            </Button>
            <Button 
              onClick={handleRunEvaluation}
              disabled={evaluating || comparing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <BarChart className="h-4 w-4" />
              {evaluating ? "Evaluating..." : "Fuzzy Only"}
            </Button>
            <div className="text-muted-foreground text-sm">
              Powered by MySwitzerland
            </div>
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
