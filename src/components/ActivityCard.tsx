import { Clock, MapPin, TrendingUp, Users } from 'lucide-react';
import { Activity } from '@/lib/api';

interface ActivityCardProps {
  activity: Activity;
  onClick: () => void;
}

const ActivityCard = ({ activity, onClick }: ActivityCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-card rounded-lg overflow-hidden transition-all hover:shadow-hover shadow-card"
      style={{ background: 'var(--gradient-card)' }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={activity.imageUrl || 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80'}
          alt={activity.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Badge */}
        {activity.experienceType && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium capitalize">
            {activity.experienceType}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
          {activity.title}
        </h3>
        
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {activity.description}
        </p>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 pt-2">
          {activity.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{activity.location}</span>
            </div>
          )}
          
          {activity.duration && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{activity.duration}</span>
            </div>
          )}
          
          {activity.difficulty && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="capitalize">{activity.difficulty}</span>
            </div>
          )}
          
          {activity.suitableFor && activity.suitableFor.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="capitalize">{activity.suitableFor[0]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
