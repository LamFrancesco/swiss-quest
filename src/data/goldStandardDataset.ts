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
    query: "cultural activities under 2 hours",
    queryType: "simple",
    intent: "cultural",
    expectedFilters: {
      experienceType: "cultural",
      neededTime: "1-2 hours"
    },
    expectedActivityIds: ["chaplin-world", "olympic-museum"],
    minExpectedResults: 2,
    explanation: "These museums offer cultural experiences that can be completed within 1-2 hours, perfect for a focused visit.",
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
      suitableFor: "families"
    },
    expectedActivityIds: ["jungfraujoch", "rhine-falls"],
    minExpectedResults: 2,
    explanation: "Family-friendly outdoor destinations with accessible facilities and activities suitable for all ages.",
    metadata: {
      source: "tourist feedback",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-003",
    query: "easy mountain hiking",
    queryType: "simple",
    intent: "outdoor low-difficulty",
    expectedFilters: {
      experienceType: "outdoor",
      difficulty: "low"
    },
    expectedActivityIds: ["mount-rigi"],
    minExpectedResults: 1,
    explanation: "Mount Rigi offers easy hiking trails with panoramic views, suitable for beginners.",
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
      neededTime: "less than 1 hour"
    },
    expectedActivityIds: ["chapel-bridge"],
    minExpectedResults: 1,
    explanation: "Quick romantic cultural experiences perfect for couples with limited time.",
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
      neededTime: "full day"
    },
    expectedActivityIds: ["jungfraujoch", "glacier-express"],
    minExpectedResults: 2,
    explanation: "Full-day adventures offering comprehensive outdoor experiences in the Swiss Alps.",
    metadata: {
      source: "expert input",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-006",
    query: "quick cultural visit with kids",
    queryType: "multi-criteria",
    intent: "cultural family-friendly quick",
    expectedFilters: {
      experienceType: "cultural",
      suitableFor: "families",
      neededTime: "less than 1 hour"
    },
    expectedActivityIds: [],
    minExpectedResults: 0,
    explanation: "Tests ability to handle queries that may have limited matching results.",
    metadata: {
      source: "synthetic query",
      dateCreated: "2025-01-15"
    }
  },
  
  // AMBIGUOUS QUERIES (30%)
  {
    id: "gs-007",
    query: "something fun for families",
    queryType: "ambiguous",
    intent: "family-friendly general",
    expectedFilters: {
      suitableFor: "families"
    },
    expectedActivityIds: ["jungfraujoch", "rhine-falls"],
    minExpectedResults: 2,
    explanation: "Ambiguous query requiring system to infer 'fun' could mean various activity types.",
    metadata: {
      source: "tourist forum",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-008",
    query: "relaxing activities",
    queryType: "ambiguous",
    intent: "relaxing general",
    expectedFilters: {},
    expectedActivityIds: [],
    minExpectedResults: 1,
    explanation: "Tests how system interprets 'relaxing' without specific activity type.",
    metadata: {
      source: "user logs",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-009",
    query: "best things to do",
    queryType: "ambiguous",
    intent: "general recommendations",
    expectedFilters: {},
    expectedActivityIds: [],
    minExpectedResults: 3,
    explanation: "Very broad query testing system's ability to provide curated top recommendations.",
    metadata: {
      source: "tourist forum",
      dateCreated: "2025-01-15"
    }
  },
  {
    id: "gs-010",
    query: "something unique",
    queryType: "ambiguous",
    intent: "unique general",
    expectedFilters: {},
    expectedActivityIds: [],
    minExpectedResults: 1,
    explanation: "Tests interpretation of subjective terms like 'unique'.",
    metadata: {
      source: "user logs",
      dateCreated: "2025-01-15"
    }
  },
  
  // OPEN-ENDED QUERIES (20%)
  {
    id: "gs-011",
    query: "what's special about Switzerland",
    queryType: "open-ended",
    intent: "general information",
    expectedFilters: {},
    expectedActivityIds: [],
    minExpectedResults: 1,
    explanation: "Informational query requiring descriptive response rather than specific activities.",
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
    expectedActivityIds: [],
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
      difficulty: "low"
    },
    expectedActivityIds: [],
    minExpectedResults: 1,
    explanation: "Context-rich query requiring inference about accessibility needs.",
    metadata: {
      source: "tourist forum",
      dateCreated: "2025-01-15"
    }
  },
  
  // EDGE CASES (10%)
  {
    id: "gs-014",
    query: "what's the weather like",
    queryType: "edge-case",
    intent: "out-of-scope",
    expectedFilters: {},
    expectedActivityIds: [],
    minExpectedResults: 0,
    explanation: "Out-of-scope query testing system's ability to handle non-activity questions.",
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
    explanation: "Random input testing error handling.",
    metadata: {
      source: "synthetic query",
      dateCreated: "2025-01-15"
    }
  }
];
