// MySwitzerland API integration
const API_KEY = 'QggpOj7O0laCbZwVjlG873l78mnRUfwx3UjzRSMb';
const BASE_URL = 'https://opendata.myswitzerland.io/v1';

// Test function to verify API connection
export async function testApiConnection(): Promise<{
  success: boolean;
  endpoint: string;
  status?: number;
  resultCount?: number;
  sampleData?: any;
  error?: string;
}> {
  const endpoint = `${BASE_URL}/attractions?lang=en&limit=5`;
  
  try {
    console.log('[API Test] Testing endpoint:', endpoint);
    
    const response = await fetch(endpoint, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
      },
    });

    console.log('[API Test] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API Test] Error response:', errorText);
      return {
        success: false,
        endpoint,
        status: response.status,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    const data = await response.json();
    console.log('[API Test] Response data:', data);

    return {
      success: true,
      endpoint,
      status: response.status,
      resultCount: data.data?.length || 0,
      sampleData: data.data?.[0] || data,
    };
  } catch (error) {
    console.error('[API Test] Fetch error:', error);
    return {
      success: false,
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

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

// Map our filter values to API facet filter values
const EXPERIENCE_TYPE_MAP: Record<string, string> = {
  'cultural': 'culture',
  'culture': 'culture',
  'outdoor': 'nature',
  'nature': 'nature',
  'adventure': 'adventure',
  'active': 'active',
  'wellness': 'relax',
  'relax': 'relax',
  'education': 'education',
};

const DIFFICULTY_MAP: Record<string, string> = {
  'low': 'low',
  'easy': 'low',
  'medium': 'medium',
  'moderate': 'medium',
  'high': 'high',
  'difficult': 'high',
  'challenging': 'high',
};

const SUITABLE_FOR_MAP: Record<string, string> = {
  'families': 'family',
  'family': 'family',
  'couples': 'couples',
  'individual': 'individual',
  'solo': 'individual',
  'groups': 'group',
  'group': 'group',
  'children': 'children',
  'seniors': 'individual', // API doesn't have seniors, map to individual
};

const NEEDED_TIME_MAP: Record<string, string> = {
  'under-1-hour': 'lessthan1hour',
  'less-than-1-hour': 'lessthan1hour',
  '1-2-hours': 'between12hours',
  '2-4-hours': '2to4hourshalfday',
  'half-day': '2to4hourshalfday',
  '4-6-hours': '4to6hours',
  'full-day': 'fullday',
  'multi-day': 'multiday',
};

export async function searchActivities(filters: {
  experienceType?: string;
  neededTime?: string;
  difficulty?: string;
  suitableFor?: string;
  query?: string;
}): Promise<Activity[]> {
  try {
    const params = new URLSearchParams();
    params.append('lang', 'en');
    params.append('limit', '20');
    
    // Build facet filters
    const facetFilters: string[] = [];
    
    if (filters.experienceType) {
      const mapped = EXPERIENCE_TYPE_MAP[filters.experienceType.toLowerCase()];
      if (mapped) facetFilters.push(`experiencetype:${mapped}`);
    }
    
    if (filters.difficulty) {
      const mapped = DIFFICULTY_MAP[filters.difficulty.toLowerCase()];
      if (mapped) facetFilters.push(`difficulty:${mapped}`);
    }
    
    if (filters.suitableFor) {
      const mapped = SUITABLE_FOR_MAP[filters.suitableFor.toLowerCase()];
      if (mapped) facetFilters.push(`suitablefortype:${mapped}`);
    }
    
    if (filters.neededTime) {
      const mapped = NEEDED_TIME_MAP[filters.neededTime.toLowerCase()];
      if (mapped) facetFilters.push(`neededtime:${mapped}`);
    }
    
    // Add facet filters to params
    facetFilters.forEach(filter => params.append('facet.filter', filter));

    const url = `${BASE_URL}/attractions?${params.toString()}`;
    console.log('[API] Searching attractions:', url);
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[API] Error response:', response.status);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const count = data.data?.length || 0;
    console.log('[API] Found', count, 'attractions from API');
    
    // Log attraction names for visibility
    if (data.data?.length > 0) {
      console.log('[API] Attractions found:');
      data.data.forEach((item: any, i: number) => {
        const exp = item.classification?.find((c: any) => c.name === 'experiencetype')?.values?.[0]?.name || '-';
        const diff = item.classification?.find((c: any) => c.name === 'difficulty')?.values?.[0]?.name || '-';
        console.log(`  ${i + 1}. ${item.name} [${exp}, ${diff}]`);
      });
    }
    
    const apiResults = transformApiAttractions(data);
    
    // If API returned results, use them; otherwise fall back to mock
    if (apiResults.length > 0) {
      return apiResults;
    }
    
    console.log('[API] No API results, falling back to mock data');
    return getMockActivities(filters);
  } catch (error) {
    console.error('[API] Error fetching activities:', error);
    return getMockActivities(filters);
  }
}

// Transform real API response to our Activity format
function transformApiAttractions(data: any): Activity[] {
  if (!data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((item: any) => {
    // Extract classification values
    const classifications = item.classification || [];
    
    const getClassificationValue = (name: string): string | undefined => {
      const classification = classifications.find((c: any) => c.name === name);
      return classification?.values?.[0]?.name;
    };
    
    const getClassificationValues = (name: string): string[] => {
      const classification = classifications.find((c: any) => c.name === name);
      return classification?.values?.map((v: any) => v.name) || [];
    };

    return {
      id: item.identifier || Math.random().toString(36),
      title: item.name || 'Swiss Attraction',
      description: item.abstract || '',
      imageUrl: item.photo,
      location: item.geo ? `${item.geo.latitude?.toFixed(2)}°N, ${item.geo.longitude?.toFixed(2)}°E` : undefined,
      duration: getClassificationValue('neededtime'),
      difficulty: getClassificationValue('difficulty'),
      suitableFor: getClassificationValues('suitablefortype'),
      experienceType: getClassificationValue('experiencetype'),
    };
  });
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
    {
      id: 'bern-old-town',
      title: 'Bern Old Town Walking Tour',
      description: 'UNESCO World Heritage site with medieval arcades, fountains, and stunning architecture.',
      imageUrl: 'https://images.unsplash.com/photo-1572207648389-08f6d3f6c040?w=800&q=80',
      location: 'Bern',
      duration: '1-2 hours',
      difficulty: 'low',
      suitableFor: ['seniors', 'couples', 'families', 'individual'],
      experienceType: 'cultural',
    },
    {
      id: 'lake-geneva-cruise',
      title: 'Lake Geneva Scenic Cruise',
      description: 'Relaxing boat ride on Lake Geneva with views of the Alps and charming lakeside towns.',
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
      location: 'Lake Geneva',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['seniors', 'couples', 'families'],
      experienceType: 'outdoor',
    },
    {
      id: 'swiss-transport-museum',
      title: 'Swiss Museum of Transport',
      description: 'Interactive museum showcasing trains, planes, automobiles, and space travel.',
      imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b6a90542?w=800&q=80',
      location: 'Lucerne',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['families', 'kids', 'groups'],
      experienceType: 'cultural',
    },
    {
      id: 'matterhorn-glacier-paradise',
      title: 'Matterhorn Glacier Paradise',
      description: 'Highest cable car station in Europe with breathtaking views of the iconic Matterhorn.',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      location: 'Zermatt',
      duration: '2-4 hours',
      difficulty: 'medium',
      suitableFor: ['families', 'individual', 'couples'],
      experienceType: 'outdoor',
    },
    {
      id: 'lavaux-vineyards',
      title: 'Lavaux Vineyards Terrace Walk',
      description: 'UNESCO terraced vineyards with wine tasting and stunning lake views.',
      imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80',
      location: 'Lavaux',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['couples', 'seniors', 'individual'],
      experienceType: 'gastronomy',
    },
    {
      id: 'pilatus-cable-car',
      title: 'Mount Pilatus Cable Car',
      description: 'Scenic cable car ride to Mount Pilatus with panoramic Alpine views.',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      location: 'Lucerne',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['seniors', 'families', 'couples'],
      experienceType: 'outdoor',
    },
    {
      id: 'ballenberg-open-air',
      title: 'Ballenberg Open-Air Museum',
      description: 'Traditional Swiss rural architecture and crafts in a beautiful open-air setting.',
      imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b6a90542?w=800&q=80',
      location: 'Brienz',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['families', 'seniors', 'groups'],
      experienceType: 'cultural',
    },
    {
      id: 'aletsch-glacier',
      title: 'Aletsch Glacier Viewing',
      description: 'View the largest glacier in the Alps from accessible viewing platforms.',
      imageUrl: 'https://images.unsplash.com/photo-1509556662326-d044e64e8a5d?w=800&q=80',
      location: 'Valais',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['seniors', 'families', 'couples'],
      experienceType: 'outdoor',
    },
    {
      id: 'chocolate-train',
      title: 'Swiss Chocolate Train',
      description: 'Scenic train journey with visits to cheese dairy and chocolate factory.',
      imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80',
      location: 'Montreux to Gruyères',
      duration: 'full day',
      difficulty: 'low',
      suitableFor: ['seniors', 'couples', 'families'],
      experienceType: 'gastronomy',
    },
    {
      id: 'zurich-lake-promenade',
      title: 'Zürich Lake Promenade',
      description: 'Leisurely walk along the beautiful Zürich lakeside with cafes and parks.',
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
      location: 'Zürich',
      duration: 'less than 1 hour',
      difficulty: 'low',
      suitableFor: ['seniors', 'couples', 'families', 'individual'],
      experienceType: 'outdoor',
    },
    {
      id: 'basel-art-museum',
      title: 'Kunstmuseum Basel',
      description: 'One of Switzerland\'s most important art museums with works from the 15th century to today.',
      imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b6a90542?w=800&q=80',
      location: 'Basel',
      duration: '1-2 hours',
      difficulty: 'low',
      suitableFor: ['couples', 'individual', 'seniors'],
      experienceType: 'cultural',
    },
    {
      id: 'leukerbad-thermal',
      title: 'Leukerbad Thermal Baths',
      description: 'Largest alpine thermal spa resort in Europe. Relax in warm mineral waters with stunning mountain views.',
      imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
      location: 'Leukerbad',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['couples', 'seniors', 'individual'],
      experienceType: 'wellness',
    },
    {
      id: 'bad-ragaz-spa',
      title: 'Tamina Therme Bad Ragaz',
      description: 'World-famous thermal spa with healing waters. Luxurious wellness experience in a serene setting.',
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
      location: 'Bad Ragaz',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['couples', 'seniors', 'individual'],
      experienceType: 'wellness',
    },
    {
      id: 'victoria-jungfrau-spa',
      title: 'Victoria-Jungfrau Spa',
      description: 'Award-winning spa with panoramic Alpine views. Massages, saunas, and relaxation pools.',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
      location: 'Interlaken',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['couples', 'individual'],
      experienceType: 'wellness',
    },
    {
      id: 'vals-thermal-baths',
      title: 'Vals Thermal Baths (7132 Therme)',
      description: 'Iconic architectural masterpiece by Peter Zumthor. Minimalist design with therapeutic thermal waters.',
      imageUrl: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80',
      location: 'Vals',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['couples', 'individual', 'seniors'],
      experienceType: 'wellness',
    },
    {
      id: 'yverdon-thermal',
      title: 'Yverdon-les-Bains Thermal Centre',
      description: 'Therapeutic sulphur springs dating back to Roman times. Family-friendly thermal pools and wellness area.',
      imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
      location: 'Yverdon-les-Bains',
      duration: '2-4 hours',
      difficulty: 'low',
      suitableFor: ['families', 'seniors', 'couples'],
      experienceType: 'wellness',
    },
  ];

  // Normalize filter values for comparison
  const normalizeValue = (value: string) => value?.toLowerCase().trim();
  
  // Map neededTime filter format to activity duration format
  const normalizeTimeFilter = (filterTime: string): string => {
    const timeMap: Record<string, string> = {
      'lessthan1hour': 'less than 1 hour',
      'between1_2hours': '1-2 hours',
      'between2_4hours': '2-4 hours',
      'between4_8hours': 'full day',
      'morethan1day': 'multiple days'
    };
    return timeMap[filterTime] || filterTime;
  };

  // Filter based on provided filters
  return mockData.filter(activity => {
    // Experience type filter
    if (filters.experienceType) {
      const filterType = normalizeValue(filters.experienceType);
      const activityType = normalizeValue(activity.experienceType || '');
      // Handle culture/cultural synonym
      const normalizedFilter = filterType === 'culture' ? 'cultural' : filterType;
      const normalizedActivity = activityType === 'culture' ? 'cultural' : activityType;
      if (normalizedActivity !== normalizedFilter) {
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
      // Handle family/families synonym
      const matchesFilter = activitySuitable.includes(filterSuitable) ||
        (filterSuitable === 'family' && activitySuitable.includes('families')) ||
        (filterSuitable === 'families' && activitySuitable.includes('family'));
      if (!matchesFilter) {
        return false;
      }
    }

    // Needed time filter with proper mapping
    if (filters.neededTime) {
      const normalizedFilterTime = normalizeValue(normalizeTimeFilter(filters.neededTime));
      const activityTime = normalizeValue(activity.duration || '');
      if (activityTime !== normalizedFilterTime) {
        return false;
      }
    }

    return true;
  });
}
