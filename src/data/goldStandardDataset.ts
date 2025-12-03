export interface GoldStandardQuery {
  id: string;
  query: string;
  queryType: 'simple' | 'ambiguous' | 'open-ended' | 'edge-case' | 'multi-criteria';
  intent: string;
  expectedFilters: {
    experienceType?: string;
    neededTime?: string;
    difficulty?: string;
    suitableFor?: string;
  };
  expectedActivityIds: string[]; // IDs of activities that should be in results
  minExpectedResults: number; // Minimum number of results expected
  explanation: string; // Why these results are ideal
  metadata: {
    source: string;
    dateCreated: string;
  };
}

export const goldStandardDataset: GoldStandardQuery[] = [
  // SIMPLE/RULE-BASED QUERIES (40%)
  {
    id: "gs-001",
    query: "cultural activities in 1-2 hours",
    queryType: "simple",
    intent: "cultural",
    expectedFilters: {
      experienceType: "cultural",
      neededTime: "between1_2hours"
    },
    expectedActivityIds: ["chaplin-world", "olympic-museum", "swiss-national-museum", "bern-old-town", "basel-art-museum"],
    minExpectedResults: 2,
    explanation: "These museums offer cultural experiences that can be completed within 1-2 hours.",
    metadata: {
      source: "expert input",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-002",
    query: "outdoor adventures for families",
    queryType: "simple",
    intent: "outdoor family-friendly",
    expectedFilters: {
      experienceType: "outdoor",
      suitableFor: "family"
    },
    expectedActivityIds: ["rhine-falls", "mount-rigi", "lake-geneva-cruise", "aletsch-glacier", "pilatus-cable-car", "zurich-lake-promenade"],
    minExpectedResults: 2,
    explanation: "Family-friendly outdoor destinations with accessible facilities.",
    metadata: {
      source: "tourist feedback",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-003",
    query: "easy outdoor hiking",
    queryType: "simple",
    intent: "outdoor low-difficulty",
    expectedFilters: {
      experienceType: "outdoor",
      difficulty: "low"
    },
    expectedActivityIds: ["mount-rigi", "rhine-falls", "lake-geneva-cruise", "pilatus-cable-car", "aletsch-glacier", "zurich-lake-promenade", "glacier-express"],
    minExpectedResults: 1,
    explanation: "Low difficulty outdoor activities suitable for beginners.",
    metadata: {
      source: "expert input",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-004",
    query: "cultural activities for couples less than 1 hour",
    queryType: "multi-criteria",
    intent: "cultural romantic quick",
    expectedFilters: {
      experienceType: "cultural",
      suitableFor: "couples",
      neededTime: "lessthan1hour"
    },
    expectedActivityIds: ["chapel-bridge"],
    minExpectedResults: 1,
    explanation: "Quick romantic cultural experiences perfect for couples.",
    metadata: {
      source: "expert input",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-005",
    query: "full day outdoor experience",
    queryType: "simple",
    intent: "outdoor extended",
    expectedFilters: {
      experienceType: "outdoor",
      neededTime: "between4_8hours"
    },
    expectedActivityIds: ["jungfraujoch"],
    minExpectedResults: 1,
    explanation: "Full-day outdoor adventures in the Swiss Alps.",
    metadata: {
      source: "expert input",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-006",
    query: "quick cultural visit for families",
    queryType: "multi-criteria",
    intent: "cultural family-friendly quick",
    expectedFilters: {
      experienceType: "cultural",
      suitableFor: "family",
      neededTime: "lessthan1hour"
    },
    expectedActivityIds: ["chapel-bridge"],
    minExpectedResults: 0,
    explanation: "Tests handling of queries with limited matching results. Chapel Bridge is cultural, family-friendly, and quick.",
    metadata: {
      source: "synthetic query",
      dateCreated: "2025-01-15"
    }
  },
  
  // AMBIGUOUS QUERIES (30%) - These test broad matching
  {
    id: "gs-007",
    query: "something fun for families",
    queryType: "ambiguous",
    intent: "family-friendly general",
    expectedFilters: {
      suitableFor: "family"
    },
    expectedActivityIds: ["chaplin-world", "olympic-museum", "jungfraujoch", "rhine-falls", "mount-rigi", "chapel-bridge", "swiss-national-museum", "gruyeres-cheese", "swiss-transport-museum", "matterhorn-glacier-paradise", "pilatus-cable-car", "ballenberg-open-air", "aletsch-glacier", "chocolate-train", "zurich-lake-promenade"],
    minExpectedResults: 5,
    explanation: "All family-suitable activities should match this broad query.",
    metadata: {
      source: "tourist forum",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-008",
    query: "easy activities for seniors",
    queryType: "ambiguous",
    intent: "senior-friendly accessible",
    expectedFilters: {
      difficulty: "low",
      suitableFor: "seniors"
    },
    expectedActivityIds: ["mount-rigi", "glacier-express", "bern-old-town", "lake-geneva-cruise", "lavaux-vineyards", "pilatus-cable-car", "ballenberg-open-air", "aletsch-glacier", "chocolate-train", "zurich-lake-promenade", "basel-art-museum"],
    minExpectedResults: 3,
    explanation: "Low difficulty activities suitable for senior travelers.",
    metadata: {
      source: "user logs",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-009",
    query: "romantic activities for couples",
    queryType: "ambiguous",
    intent: "couples romantic",
    expectedFilters: {
      suitableFor: "couples"
    },
    expectedActivityIds: ["chaplin-world", "chapel-bridge", "glacier-express", "bern-old-town", "lake-geneva-cruise", "matterhorn-glacier-paradise", "lavaux-vineyards", "pilatus-cable-car", "aletsch-glacier", "chocolate-train", "zurich-lake-promenade", "basel-art-museum"],
    minExpectedResults: 5,
    explanation: "Activities suitable for couples seeking romantic experiences.",
    metadata: {
      source: "tourist forum",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-010",
    query: "outdoor activities",
    queryType: "ambiguous",
    intent: "outdoor general",
    expectedFilters: {
      experienceType: "outdoor"
    },
    expectedActivityIds: ["jungfraujoch", "rhine-falls", "mount-rigi", "glacier-express", "lake-geneva-cruise", "matterhorn-glacier-paradise", "pilatus-cable-car", "aletsch-glacier", "zurich-lake-promenade"],
    minExpectedResults: 3,
    explanation: "All outdoor activities should be returned.",
    metadata: {
      source: "user logs",
      dateCreated: "2025-01-15"
    }
  },
  
  // OPEN-ENDED QUERIES (20%)
  {
    id: "gs-011",
    query: "cultural experiences",
    queryType: "open-ended",
    intent: "cultural general",
    expectedFilters: {
      experienceType: "cultural"
    },
    expectedActivityIds: ["chaplin-world", "olympic-museum", "chapel-bridge", "swiss-national-museum", "bern-old-town", "swiss-transport-museum", "ballenberg-open-air", "basel-art-museum"],
    minExpectedResults: 3,
    explanation: "All cultural activities should match.",
    metadata: {
      source: "tourist forum",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-012",
    query: "tell me about outdoor activities",
    queryType: "open-ended",
    intent: "outdoor general-information",
    expectedFilters: {
      experienceType: "outdoor"
    },
    expectedActivityIds: ["jungfraujoch", "rhine-falls", "mount-rigi", "glacier-express", "lake-geneva-cruise", "matterhorn-glacier-paradise", "pilatus-cable-car", "aletsch-glacier", "zurich-lake-promenade"],
    minExpectedResults: 2,
    explanation: "Broad exploratory query about outdoor options.",
    metadata: {
      source: "user logs",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-013",
    query: "planning a trip with elderly parents",
    queryType: "open-ended",
    intent: "accessibility advice",
    expectedFilters: {
      difficulty: "low",
      suitableFor: "seniors"
    },
    expectedActivityIds: ["mount-rigi", "glacier-express", "bern-old-town", "lake-geneva-cruise", "lavaux-vineyards", "pilatus-cable-car", "ballenberg-open-air", "aletsch-glacier", "chocolate-train", "zurich-lake-promenade", "basel-art-museum"],
    minExpectedResults: 3,
    explanation: "Context-rich query requiring inference about accessibility needs for elderly/senior travelers.",
    metadata: {
      source: "tourist forum",
      dateCreated: "2025-01-15"
    }
  },
  
  // EDGE CASES (10%)
  {
    id: "gs-014",
    query: "gastronomy experiences",
    queryType: "simple",
    intent: "gastronomy",
    expectedFilters: {
      experienceType: "gastronomy"
    },
    expectedActivityIds: ["gruyeres-cheese", "lavaux-vineyards", "chocolate-train"],
    minExpectedResults: 1,
    explanation: "Tests gastronomy category filtering.",
    metadata: {
      source: "synthetic query",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-015",
    query: "asdfghjkl",
    queryType: "edge-case",
    intent: "invalid input",
    expectedFilters: {},
    expectedActivityIds: [],
    minExpectedResults: 0,
    explanation: "Random input testing error handling - should return no specific filters.",
    metadata: {
      source: "synthetic query",
      dateCreated: "2025-01-15"
    }
  }
];
