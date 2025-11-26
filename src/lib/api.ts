// MySwitzerland API integration
const API_KEY = 'QggpOj7O0laCbZwVjlG873l78mnRUfwx3UjzRSMb';
const BASE_URL = 'https://api.myswitzerland.io/v1';

export interface Activity {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  location?: string;
  duration?: string;
  difficulty?: string;
  suitableFor?: string[];
  experienceType?: string;
}

export async function searchActivities(filters: {
  experienceType?: string;
  neededTime?: string;
  difficulty?: string;
  suitableFor?: string;
  query?: string;
}): Promise<Activity[]> {
  try {
    const params = new URLSearchParams();
    
    if (filters.experienceType) params.append('experiencetype', filters.experienceType);
    if (filters.neededTime) params.append('neededtime', filters.neededTime);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.suitableFor) params.append('suitablefor', filters.suitableFor);
    if (filters.query) params.append('q', filters.query);

    const url = `${BASE_URL}/activities?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform API response to our Activity format
    return transformActivities(data);
  } catch (error) {
    console.error('Error fetching activities:', error);
    // Return mock data for development
    return getMockActivities(filters);
  }
}

function transformActivities(data: any): Activity[] {
  // Transform based on actual API response structure
  if (!data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((item: any) => ({
    id: item.id || Math.random().toString(36),
    title: item.title || item.name || 'Swiss Activity',
    description: item.description || item.teaser || '',
    imageUrl: item.image?.url || item.images?.[0]?.url,
    location: item.location?.name || item.city,
    duration: item.duration || item.neededTime,
    difficulty: item.difficulty,
    suitableFor: item.suitableFor || [],
    experienceType: item.experienceType,
  }));
}

// Mock data for development/fallback
function getMockActivities(filters: any): Activity[] {
  const mockData: Activity[] = [
    {
      id: 'chaplin-world',
      title: "Chaplin's World",
      description: 'Discover the world of Charlie Chaplin in his former Swiss home. Immersive museum experience.',
      imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b6a90542?w=800&q=80',
      location: 'Corsier-sur-Vevey',
      duration: '1-2 hours',
      difficulty: 'low',
      suitableFor: ['families', 'couples', 'individual'],
      experienceType: 'cultural',
    },
    {
      id: 'olympic-museum',
      title: 'Olympic Museum',
      description: 'Explore the history of the Olympic Games through interactive exhibits and memorabilia.',
      imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b6a90542?w=800&q=80',
      location: 'Lausanne',
      duration: '1-2 hours',
      difficulty: 'low',
      suitableFor: ['families', 'kids', 'groups'],
      experienceType: 'cultural',
    },
    {
      id: 'jungfraujoch',
      title: 'Jungfraujoch - Top of Europe',
      description: 'Journey to the highest railway station in Europe. Marvel at the Aletsch Glacier and Alpine panorama.',
      imageUrl: 'https://images.unsplash.com/photo-1509556662326-d044e64e8a5d?w=800&q=80',
      location: 'Jungfrau Region',
      duration: 'full day',
      difficulty: 'medium',
      suitableFor: ['families', 'groups', 'individual'],
      experienceType: 'outdoor',
    },
    {
      id: 'rhine-falls',
      title: 'Rhine Falls',
      description: "Europe's largest waterfall. Experience the thundering falls from viewing platforms and boat trips.",
      imageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
      location: 'Schaffhausen',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['families', 'kids', 'groups'],
      experienceType: 'outdoor',
    },
    {
      id: 'mount-rigi',
      title: 'Mount Rigi - Queen of Mountains',
      description: 'Easy accessible mountain with stunning panoramic views. Perfect for gentle hiking and relaxation.',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      location: 'Central Switzerland',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['families', 'seniors', 'individual'],
      experienceType: 'outdoor',
    },
    {
      id: 'chapel-bridge',
      title: 'Chapel Bridge & Old Town Lucerne',
      description: 'Walk across the iconic wooden bridge and explore the charming medieval old town.',
      imageUrl: 'https://images.unsplash.com/photo-1572207648389-08f6d3f6c040?w=800&q=80',
      location: 'Lucerne',
      duration: 'less than 1 hour',
      difficulty: 'low',
      suitableFor: ['couples', 'families', 'individual'],
      experienceType: 'cultural',
    },
    {
      id: 'glacier-express',
      title: 'Glacier Express',
      description: 'Legendary panoramic train journey through the Swiss Alps. An unforgettable full-day experience.',
      imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80',
      location: 'Zermatt to St. Moritz',
      duration: 'full day',
      difficulty: 'low',
      suitableFor: ['couples', 'seniors', 'groups'],
      experienceType: 'outdoor',
    },
    {
      id: 'swiss-national-museum',
      title: 'Swiss National Museum',
      description: 'Discover Swiss cultural history from its beginnings to the present.',
      imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b6a90542?w=800&q=80',
      location: 'Zurich',
      duration: '1-2 hours',
      difficulty: 'low',
      suitableFor: ['families', 'individual'],
      experienceType: 'cultural',
    },
    {
      id: 'gruyeres-cheese',
      title: 'Gruyères Cheese Factory Tour',
      description: 'Discover the secrets of Swiss cheese making and taste authentic Gruyère AOP.',
      imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&q=80',
      location: 'Gruyères',
      duration: 'less than 1 hour',
      difficulty: 'low',
      suitableFor: ['families', 'groups'],
      experienceType: 'gastronomy',
    },
  ];

  // Normalize filter values for comparison
  const normalizeValue = (value: string) => value?.toLowerCase().trim();

  // Filter based on provided filters
  return mockData.filter(activity => {
    // Experience type filter
    if (filters.experienceType) {
      const filterType = normalizeValue(filters.experienceType);
      const activityType = normalizeValue(activity.experienceType || '');
      if (activityType !== filterType) {
        return false;
      }
    }

    // Difficulty filter
    if (filters.difficulty) {
      const filterDifficulty = normalizeValue(filters.difficulty);
      const activityDifficulty = normalizeValue(activity.difficulty || '');
      if (activityDifficulty !== filterDifficulty) {
        return false;
      }
    }

    // Suitable for filter
    if (filters.suitableFor) {
      const filterSuitable = normalizeValue(filters.suitableFor);
      const activitySuitable = activity.suitableFor?.map(s => normalizeValue(s)) || [];
      if (!activitySuitable.includes(filterSuitable)) {
        return false;
      }
    }

    // Needed time filter
    if (filters.neededTime) {
      const filterTime = normalizeValue(filters.neededTime);
      const activityTime = normalizeValue(activity.duration || '');
      if (activityTime !== filterTime) {
        return false;
      }
    }

    return true;
  });
}
