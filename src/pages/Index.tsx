import { useState, useEffect } from 'react';
import { Mountain, BarChart, GitCompare, Bot, Cpu, Sparkles, Wifi } from 'lucide-react';
import ChatInterface, { Message } from '@/components/ChatInterface';
import ActivityDetail from '@/components/ActivityDetail';
import { parseQuery, parseQueryAsync, initSemanticParser } from '@/lib/nlp';
import { parseQueryWithLLM } from '@/lib/nlpLLM';
import { searchActivities, Activity, testApiConnection } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { runFullEvaluation } from '@/lib/metrics';
import { runModelComparison } from '@/lib/metricsComparison';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';

export type ModelType = 'fuzzy' | 'llm' | 'compare';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelType>('fuzzy');
  const [embeddingsReady, setEmbeddingsReady] = useState(false);

  // Initialize embeddings model on mount
  useEffect(() => {
    initSemanticParser().then((success) => {
      setEmbeddingsReady(success);
      if (success) {
        toast.success("Semantic embeddings loaded!", {
          description: "Using transformer model for higher accuracy"
        });
      }
    });
  }, []);

  const handleTestApi = async () => {
    setTestingApi(true);
    toast.info("Testing MySwitzerland API...", {
      description: "Checking /attractions endpoint"
    });
    
    try {
      const result = await testApiConnection();
      
      if (result.success) {
        toast.success("API connection works!", {
          description: `Found ${result.resultCount} attractions. Check console for details.`
        });
        console.log('[API Test] Full result:', result);
      } else {
        toast.error("API connection failed", {
          description: result.error || "Unknown error"
        });
        console.error('[API Test] Failed:', result);
      }
    } catch (error) {
      console.error("API test error:", error);
      toast.error("API test failed", {
        description: "Check the console for error details"
      });
    } finally {
      setTestingApi(false);
    }
  };

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
      if (activeModel === 'compare') {
        // Run both models in parallel for comparison
        const startFuzzy = performance.now();
        const fuzzyParsed = embeddingsReady ? await parseQueryAsync(query) : parseQuery(query);
        const fuzzyLatency = performance.now() - startFuzzy;

        const startLLM = performance.now();
        const llmParsed = await parseQueryWithLLM(query);
        const llmLatency = performance.now() - startLLM;

        // Add comparison message showing both results side-by-side
        const comparisonMessage: Message = {
          id: `comparison-${Date.now()}`,
          type: 'comparison',
          fuzzyResult: {
            filters: {
              experienceType: fuzzyParsed.experienceType,
              neededTime: fuzzyParsed.neededTime,
              difficulty: fuzzyParsed.difficulty,
              suitableFor: fuzzyParsed.suitableFor,
            },
            confidence: fuzzyParsed.confidence,
            avgConfidence: fuzzyParsed.avgConfidence,
            latency: Math.round(fuzzyLatency),
          },
          llmResult: {
            filters: {
              experienceType: llmParsed.experienceType,
              neededTime: llmParsed.neededTime,
              difficulty: llmParsed.difficulty,
              suitableFor: llmParsed.suitableFor,
            },
            confidence: llmParsed.confidence,
            avgConfidence: llmParsed.avgConfidence,
            latency: Math.round(llmLatency),
          },
        };
        setMessages(prev => [...prev, comparisonMessage]);

        // Use LLM result for search (typically more accurate for complex queries)
        const results = await searchActivities({
          experienceType: llmParsed.experienceType,
          neededTime: llmParsed.neededTime,
          difficulty: llmParsed.difficulty,
          suitableFor: llmParsed.suitableFor,
          query,
        });

        const limitedResults = results.slice(0, 7);
        if (limitedResults.length === 0) {
          const noResultsMessage: Message = {
            id: `assistant-${Date.now()}-no-results`,
            type: 'assistant',
            content: "I couldn't find any activities matching those criteria. Try adjusting your search!",
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
      } else {
        // Single model mode
        let parsed;
        const startTime = performance.now();
        
        if (activeModel === 'llm') {
          parsed = await parseQueryWithLLM(query);
        } else {
          // Use embeddings-enhanced parser if available
          parsed = embeddingsReady ? await parseQueryAsync(query) : parseQuery(query);
        }
        
        const latency = performance.now() - startTime;
        
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
            confidence: parsed.confidence,
            avgConfidence: parsed.avgConfidence,
            model: activeModel,
            latency: Math.round(latency),
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
            {/* Model Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Toggle
                pressed={activeModel === 'fuzzy'}
                onPressedChange={() => setActiveModel('fuzzy')}
                size="sm"
                className="gap-1.5 data-[state=on]:bg-background"
              >
                <Cpu className="h-3.5 w-3.5" />
                Fuzzy
                {embeddingsReady && activeModel === 'fuzzy' && (
                  <Sparkles className="h-3 w-3 text-amber-500" />
                )}
              </Toggle>
              <Toggle
                pressed={activeModel === 'llm'}
                onPressedChange={() => setActiveModel('llm')}
                size="sm"
                className="gap-1.5 data-[state=on]:bg-background"
              >
                <Bot className="h-3.5 w-3.5" />
                LLM
              </Toggle>
              <Toggle
                pressed={activeModel === 'compare'}
                onPressedChange={() => setActiveModel('compare')}
                size="sm"
                className="gap-1.5 data-[state=on]:bg-background data-[state=on]:text-primary"
              >
                <GitCompare className="h-3.5 w-3.5" />
                Compare
              </Toggle>
            </div>
            
            <div className="h-4 w-px bg-border" />
            
            <Button 
              onClick={handleTestApi}
              disabled={testingApi || comparing || evaluating || loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Wifi className="h-4 w-4" />
              {testingApi ? "Testing..." : "Test API"}
            </Button>
            <Button 
              onClick={handleRunComparison}
              disabled={comparing || evaluating || loading}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <GitCompare className="h-4 w-4" />
              {comparing ? "Comparing..." : "Compare"}
            </Button>
            <Button 
              onClick={handleRunEvaluation}
              disabled={evaluating || comparing || loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <BarChart className="h-4 w-4" />
              {evaluating ? "Evaluating..." : "Eval Fuzzy"}
            </Button>
            <div className="text-muted-foreground text-sm hidden md:block">
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
