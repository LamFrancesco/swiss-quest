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
      id: '1',
      title: 'Matterhorn Glacier Paradise',
      description: 'Experience the highest cable car station in Europe at 3,883m. Enjoy breathtaking panoramic views of the Alps.',
      imageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
      location: 'Zermatt',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['family', 'groups'],
      experienceType: 'outdoor',
    },
    {
      id: '2',
      title: 'Swiss National Museum',
      description: 'Discover Swiss cultural history from its beginnings to the present in this historic castle-like building.',
      imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b6a90542?w=800&q=80',
      location: 'Zurich',
      duration: '1-2 hours',
      difficulty: 'low',
      suitableFor: ['family', 'individual'],
      experienceType: 'culture',
    },
    {
      id: '3',
      title: 'Jungfraujoch - Top of Europe',
      description: 'Journey to the highest railway station in Europe. Marvel at the Aletsch Glacier and Alpine panorama.',
      imageUrl: 'https://images.unsplash.com/photo-1509556662326-d044e64e8a5d?w=800&q=80',
      location: 'Jungfrau Region',
      duration: '4-8 hours',
      difficulty: 'medium',
      suitableFor: ['groups', 'individual'],
      experienceType: 'outdoor',
    },
    {
      id: '4',
      title: 'Chapel Bridge & Old Town Lucerne',
      description: 'Walk across the iconic wooden bridge and explore the charming medieval old town.',
      imageUrl: 'https://images.unsplash.com/photo-1572207648389-08f6d3f6c040?w=800&q=80',
      location: 'Lucerne',
      duration: '1-2 hours',
      difficulty: 'low',
      suitableFor: ['family', 'groups', 'individual'],
      experienceType: 'culture',
    },
    {
      id: '5',
      title: 'Gruyères Cheese Factory Tour',
      description: 'Discover the secrets of Swiss cheese making and taste authentic Gruyère AOP.',
      imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&q=80',
      location: 'Gruyères',
      duration: 'Less than 1 hour',
      difficulty: 'low',
      suitableFor: ['family', 'groups'],
      experienceType: 'gastronomy',
    },
  ];

  // Filter based on provided filters
  return mockData.filter(activity => {
    if (filters.experienceType && activity.experienceType !== filters.experienceType) {
      return false;
    }
    if (filters.difficulty && activity.difficulty !== filters.difficulty) {
      return false;
    }
    return true;
  });
}
