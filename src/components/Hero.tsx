import { Search } from 'lucide-react';
import heroImage from '@/assets/hero-swiss-alps.jpg';

interface HeroProps {
  onSearch: (query: string) => void;
}

const Hero = ({ onSearch }: HeroProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <div className="relative h-[600px] overflow-hidden">
      {/* Hero Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            SwissQuest
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Discover your perfect Swiss adventure with intelligent recommendations
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                name="search"
                placeholder="Try: 'I want something cultural for maximum 2 hours' or 'Outdoor activity, not too difficult'"
                className="w-full px-6 py-4 pr-14 rounded-full text-lg bg-white/95 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-lg transition-all hover:bg-white"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-3 rounded-full hover:bg-primary/90 transition-all hover:shadow-swiss"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {[
              'Cultural activities',
              'Family-friendly',
              'Mountain adventures',
              'Quick visits'
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSearch(suggestion)}
                className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm hover:bg-white/30 transition-all border border-white/30"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
