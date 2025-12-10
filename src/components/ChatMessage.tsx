import { Bot, User, Cpu, Sparkles, GitCompare } from 'lucide-react';
import { Activity } from '@/lib/api';
import ActivityCard from './ActivityCard';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ConfidenceScores } from '@/lib/nlp';

interface FilterResult {
  filters: {
    experienceType?: string;
    neededTime?: string;
    difficulty?: string;
    suitableFor?: string;
  };
  confidence?: ConfidenceScores;
  avgConfidence?: number;
  latency: number;
}

interface ChatMessageProps {
  type: 'user' | 'assistant' | 'activities' | 'understanding' | 'comparison';
  content?: string;
  activities?: Activity[];
  filters?: {
    experienceType?: string;
    neededTime?: string;
    difficulty?: string;
    suitableFor?: string;
  };
  confidence?: ConfidenceScores;
  avgConfidence?: number;
  model?: 'fuzzy' | 'llm' | 'compare';
  latency?: number;
  fuzzyResult?: FilterResult;
  llmResult?: FilterResult;
  onActivityClick?: (activity: Activity) => void;
}

const ChatMessage = ({ type, content, activities, filters, confidence, avgConfidence, model, latency, fuzzyResult, llmResult, onActivityClick }: ChatMessageProps) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatConfidence = (score?: number) => {
    if (score === undefined) return null;
    return `${Math.round(score * 100)}%`;
  };
  const getFilterLabel = (key: string, value: string) => {
    const labels: Record<string, Record<string, string>> = {
      experienceType: {
        culture: 'cultural',
        outdoor: 'outdoor',
        gastronomy: 'gastronomy',
        shopping: 'shopping',
        wellness: 'wellness',
      },
      neededTime: {
        lessthan1hour: 'less than 1 hour',
        between1_2hours: '1-2 hours',
        between2_4hours: '2-4 hours',
        between4_8hours: '4-8 hours',
        morethan1day: 'more than 1 day',
      },
      difficulty: {
        low: 'easy',
        medium: 'moderate',
        high: 'difficult',
      },
      suitableFor: {
        family: 'families',
        groups: 'groups',
        individual: 'solo travelers',
      },
    };
    return labels[key]?.[value] || value;
  };

  if (type === 'user') {
    return (
      <div className="flex gap-3 justify-end">
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
          <p className="text-sm">{content}</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
      </div>
    );
  }

  if (type === 'understanding' && filters) {
    const filterParts: string[] = [];
    if (filters.experienceType) filterParts.push(getFilterLabel('experienceType', filters.experienceType));
    if (filters.suitableFor) filterParts.push(`suitable for ${getFilterLabel('suitableFor', filters.suitableFor)}`);
    if (filters.neededTime) filterParts.push(`lasting ${getFilterLabel('neededTime', filters.neededTime)}`);
    if (filters.difficulty) filterParts.push(`${getFilterLabel('difficulty', filters.difficulty)} difficulty`);

    return (
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="bg-accent px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%]">
          {/* Model indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              model === 'llm' 
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              {model === 'llm' ? (
                <>
                  <Sparkles className="h-3 w-3" />
                  LLM
                </>
              ) : (
                <>
                  <Cpu className="h-3 w-3" />
                  Fuzzy
                </>
              )}
            </div>
            {latency !== undefined && (
              <span className="text-xs text-muted-foreground">{latency}ms</span>
            )}
          </div>
          
          <p className="text-sm text-foreground mb-3">
            I understood that you're looking for something:
            {avgConfidence !== undefined && (
              <span className="ml-2 text-xs text-muted-foreground">
                (avg confidence: {formatConfidence(avgConfidence)})
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.experienceType && (
              <div className="flex flex-col gap-1">
                <Badge variant="default" className="text-xs">
                  {getFilterLabel('experienceType', filters.experienceType)}
                </Badge>
                {confidence?.experienceType !== undefined && (
                  <div className="flex items-center gap-1">
                    <Progress value={confidence.experienceType * 100} className="h-1 w-16" indicatorClassName={getConfidenceColor(confidence.experienceType)} />
                    <span className="text-[10px] text-muted-foreground">{formatConfidence(confidence.experienceType)}</span>
                  </div>
                )}
              </div>
            )}
            {filters.suitableFor && (
              <div className="flex flex-col gap-1">
                <Badge variant="secondary" className="text-xs">
                  for {getFilterLabel('suitableFor', filters.suitableFor)}
                </Badge>
                {confidence?.suitableFor !== undefined && (
                  <div className="flex items-center gap-1">
                    <Progress value={confidence.suitableFor * 100} className="h-1 w-16" indicatorClassName={getConfidenceColor(confidence.suitableFor)} />
                    <span className="text-[10px] text-muted-foreground">{formatConfidence(confidence.suitableFor)}</span>
                  </div>
                )}
              </div>
            )}
            {filters.neededTime && (
              <div className="flex flex-col gap-1">
                <Badge variant="secondary" className="text-xs">
                  {getFilterLabel('neededTime', filters.neededTime)}
                </Badge>
                {confidence?.neededTime !== undefined && (
                  <div className="flex items-center gap-1">
                    <Progress value={confidence.neededTime * 100} className="h-1 w-16" indicatorClassName={getConfidenceColor(confidence.neededTime)} />
                    <span className="text-[10px] text-muted-foreground">{formatConfidence(confidence.neededTime)}</span>
                  </div>
                )}
              </div>
            )}
            {filters.difficulty && (
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="text-xs">
                  {getFilterLabel('difficulty', filters.difficulty)}
                </Badge>
                {confidence?.difficulty !== undefined && (
                  <div className="flex items-center gap-1">
                    <Progress value={confidence.difficulty * 100} className="h-1 w-16" indicatorClassName={getConfidenceColor(confidence.difficulty)} />
                    <span className="text-[10px] text-muted-foreground">{formatConfidence(confidence.difficulty)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'comparison' && fuzzyResult && llmResult) {
    const renderFilterBadges = (result: FilterResult) => (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {result.filters.experienceType && (
            <div className="flex flex-col gap-0.5">
              <Badge variant="default" className="text-xs">
                {getFilterLabel('experienceType', result.filters.experienceType)}
              </Badge>
              {result.confidence?.experienceType !== undefined && (
                <div className="flex items-center gap-1">
                  <Progress value={result.confidence.experienceType * 100} className="h-1 w-12" indicatorClassName={getConfidenceColor(result.confidence.experienceType)} />
                  <span className="text-[10px] text-muted-foreground">{formatConfidence(result.confidence.experienceType)}</span>
                </div>
              )}
            </div>
          )}
          {result.filters.suitableFor && (
            <div className="flex flex-col gap-0.5">
              <Badge variant="secondary" className="text-xs">
                for {getFilterLabel('suitableFor', result.filters.suitableFor)}
              </Badge>
              {result.confidence?.suitableFor !== undefined && (
                <div className="flex items-center gap-1">
                  <Progress value={result.confidence.suitableFor * 100} className="h-1 w-12" indicatorClassName={getConfidenceColor(result.confidence.suitableFor)} />
                  <span className="text-[10px] text-muted-foreground">{formatConfidence(result.confidence.suitableFor)}</span>
                </div>
              )}
            </div>
          )}
          {result.filters.neededTime && (
            <div className="flex flex-col gap-0.5">
              <Badge variant="secondary" className="text-xs">
                {getFilterLabel('neededTime', result.filters.neededTime)}
              </Badge>
              {result.confidence?.neededTime !== undefined && (
                <div className="flex items-center gap-1">
                  <Progress value={result.confidence.neededTime * 100} className="h-1 w-12" indicatorClassName={getConfidenceColor(result.confidence.neededTime)} />
                  <span className="text-[10px] text-muted-foreground">{formatConfidence(result.confidence.neededTime)}</span>
                </div>
              )}
            </div>
          )}
          {result.filters.difficulty && (
            <div className="flex flex-col gap-0.5">
              <Badge variant="outline" className="text-xs">
                {getFilterLabel('difficulty', result.filters.difficulty)}
              </Badge>
              {result.confidence?.difficulty !== undefined && (
                <div className="flex items-center gap-1">
                  <Progress value={result.confidence.difficulty * 100} className="h-1 w-12" indicatorClassName={getConfidenceColor(result.confidence.difficulty)} />
                  <span className="text-[10px] text-muted-foreground">{formatConfidence(result.confidence.difficulty)}</span>
                </div>
              )}
            </div>
          )}
          {!result.filters.experienceType && !result.filters.suitableFor && 
           !result.filters.neededTime && !result.filters.difficulty && (
            <span className="text-xs text-muted-foreground italic">No filters detected</span>
          )}
        </div>
        {result.avgConfidence !== undefined && (
          <div className="text-[10px] text-muted-foreground">
            Avg confidence: {formatConfidence(result.avgConfidence)}
          </div>
        )}
      </div>
    );

    return (
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <GitCompare className="h-4 w-4 text-primary" />
        </div>
        <div className="bg-accent px-4 py-3 rounded-2xl rounded-tl-sm max-w-[90%] w-full">
          <p className="text-sm text-foreground mb-3">
            Side-by-side comparison of how each model parsed your query:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fuzzy Result */}
            <div className="bg-background/50 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Cpu className="h-3 w-3" />
                  Fuzzy
                </div>
                <span className="text-xs text-muted-foreground">{fuzzyResult.latency}ms</span>
              </div>
              {renderFilterBadges(fuzzyResult)}
            </div>
            
            {/* LLM Result */}
            <div className="bg-background/50 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  <Sparkles className="h-3 w-3" />
                  LLM
                </div>
                <span className="text-xs text-muted-foreground">{llmResult.latency}ms</span>
              </div>
              {renderFilterBadges(llmResult)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'activities' && activities) {
    return (
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="bg-accent px-4 py-3 rounded-2xl rounded-tl-sm">
            <p className="text-sm text-foreground">
              I found {activities.length} {activities.length === 1 ? 'activity' : 'activities'} that match your preferences! 🏔️
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onClick={() => onActivityClick?.(activity)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="bg-accent px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%]">
        <p className="text-sm text-foreground">{content}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
