import { Bot, User, Cpu, Sparkles } from 'lucide-react';
import { Activity } from '@/lib/api';
import ActivityCard from './ActivityCard';
import { Badge } from './ui/badge';

interface ChatMessageProps {
  type: 'user' | 'assistant' | 'activities' | 'understanding';
  content?: string;
  activities?: Activity[];
  filters?: {
    experienceType?: string;
    neededTime?: string;
    difficulty?: string;
    suitableFor?: string;
  };
  model?: 'fuzzy' | 'llm';
  latency?: number;
  onActivityClick?: (activity: Activity) => void;
}

const ChatMessage = ({ type, content, activities, filters, model, latency, onActivityClick }: ChatMessageProps) => {
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
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.experienceType && (
              <Badge variant="default" className="text-xs">
                {getFilterLabel('experienceType', filters.experienceType)}
              </Badge>
            )}
            {filters.suitableFor && (
              <Badge variant="secondary" className="text-xs">
                for {getFilterLabel('suitableFor', filters.suitableFor)}
              </Badge>
            )}
            {filters.neededTime && (
              <Badge variant="secondary" className="text-xs">
                {getFilterLabel('neededTime', filters.neededTime)}
              </Badge>
            )}
            {filters.difficulty && (
              <Badge variant="outline" className="text-xs">
                {getFilterLabel('difficulty', filters.difficulty)}
              </Badge>
            )}
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
