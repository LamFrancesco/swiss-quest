export interface GoldStandardQuery {
  id: string;
  query: string;
  expectedFilters: {
    experienceType?: string;
    neededTime?: string;
    difficulty?: string;
    suitableFor?: string;
  };
  expectedActivityIds: string[]; // IDs of activities that should be in results
  minExpectedResults: number; // Minimum number of results expected
}

export const goldStandardDataset: GoldStandardQuery[] = [
  {
    id: "gs-001",
    query: "cultural activities under 2 hours",
    expectedFilters: {
      experienceType: "cultural",
      neededTime: "1-2 hours"
    },
    expectedActivityIds: ["chaplin-world", "olympic-museum"],
    minExpectedResults: 2
  },
  {
    id: "gs-002",
    query: "outdoor adventures for families",
    expectedFilters: {
      experienceType: "outdoor",
      suitableFor: "families"
    },
    expectedActivityIds: ["jungfraujoch", "rhine-falls"],
    minExpectedResults: 2
  },
  {
    id: "gs-003",
    query: "easy mountain hiking",
    expectedFilters: {
      experienceType: "outdoor",
      difficulty: "low"
    },
    expectedActivityIds: ["mount-rigi"],
    minExpectedResults: 1
  },
  {
    id: "gs-004",
    query: "cultural activities for couples less than 1 hour",
    expectedFilters: {
      experienceType: "cultural",
      suitableFor: "couples",
      neededTime: "less than 1 hour"
    },
    expectedActivityIds: ["chapel-bridge"],
    minExpectedResults: 1
  },
  {
    id: "gs-005",
    query: "full day outdoor experience",
    expectedFilters: {
      experienceType: "outdoor",
      neededTime: "full day"
    },
    expectedActivityIds: ["jungfraujoch", "glacier-express"],
    minExpectedResults: 2
  }
];
