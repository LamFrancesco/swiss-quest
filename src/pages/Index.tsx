import { useState } from 'react';
import { Loader2, Mountain } from 'lucide-react';
import Hero from '@/components/Hero';
import ActivityCard from '@/components/ActivityCard';
import ActivityDetail from '@/components/ActivityDetail';
import { parseQuery } from '@/lib/nlp';
import { searchActivities, Activity } from '@/lib/api';
import { toast } from 'sonner';

const Index = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setSearchPerformed(true);

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
        toast.success('Understanding your request', {
          description: understood.join(' • '),
        });
      }

      // Search activities
      const results = await searchActivities({
        experienceType: parsed.experienceType,
        neededTime: parsed.neededTime,
        difficulty: parsed.difficulty,
        suitableFor: parsed.suitableFor,
        query,
      });

      setActivities(results);

      if (results.length === 0) {
        toast.info('No activities found', {
          description: 'Try adjusting your search criteria',
        });
      }
    } catch (error) {
      toast.error('Search failed', {
        description: 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Mountain className="h-6 w-6" />
            <span className="font-bold text-lg">SwissQuest</span>
          </div>
          <div className="text-white/80 text-sm">
            Powered by MySwitzerland
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <Hero onSearch={handleSearch} />

      {/* Results Section */}
      {searchPerformed && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Searching for perfect experiences...</p>
            </div>
          ) : activities.length > 0 ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Recommended Activities
                </h2>
                <p className="text-muted-foreground">
                  Found {activities.length} {activities.length === 1 ? 'activity' : 'activities'} matching your preferences
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onClick={() => setSelectedActivity(activity)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Mountain className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No activities found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Try adjusting your search criteria or use different keywords
              </p>
            </div>
          )}
        </div>
      )}

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
