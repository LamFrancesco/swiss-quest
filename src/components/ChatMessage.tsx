import { Bot, User } from 'lucide-react';
import { Activity } from '@/lib/api';
import ActivityCard from './ActivityCard';

interface ChatMessageProps {
  type: 'user' | 'assistant' | 'activities';
  content?: string;
  activities?: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

const ChatMessage = ({ type, content, activities, onActivityClick }: ChatMessageProps) => {
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
