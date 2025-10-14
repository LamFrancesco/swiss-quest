import { X, MapPin, Clock, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { Activity } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ActivityDetailProps {
  activity: Activity | null;
  open: boolean;
  onClose: () => void;
}

const ActivityDetail = ({ activity, open, onClose }: ActivityDetailProps) => {
  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{activity.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          {activity.imageUrl && (
            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden">
              <img
                src={activity.imageUrl}
                alt={activity.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Meta Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activity.location && (
              <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium text-sm">{activity.location}</p>
                </div>
              </div>
            )}

            {activity.duration && (
              <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium text-sm">{activity.duration}</p>
                </div>
              </div>
            )}

            {activity.difficulty && (
              <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Difficulty</p>
                  <p className="font-medium text-sm capitalize">{activity.difficulty}</p>
                </div>
              </div>
            )}

            {activity.suitableFor && activity.suitableFor.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Suitable For</p>
                  <p className="font-medium text-sm capitalize">{activity.suitableFor.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-2">About this experience</h3>
            <p className="text-muted-foreground leading-relaxed">{activity.description}</p>
          </div>

          {/* Experience Type */}
          {activity.experienceType && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <span className="font-semibold">Experience Type:</span>{' '}
                <span className="capitalize text-primary">{activity.experienceType}</span>
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="flex gap-3 pt-4">
            <button className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-all font-medium">
              <ExternalLink className="h-4 w-4" />
              Visit MySwitzerland.com
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDetail;
