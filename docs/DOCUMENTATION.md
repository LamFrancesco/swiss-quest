# SwissQuest - Technical Documentation

**Version**: 1.0.0  
**Last Updated**: December 2024

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technologies](#technologies)
4. [NLP Parsing Approaches](#nlp-parsing-approaches)
5. [Fuzzy Metrics Calculation](#fuzzy-metrics-calculation)
6. [Project Structure](#project-structure)
7. [API Reference](#api-reference)
8. [Deployment](#deployment)
9. [Cloud Dependencies](#cloud-dependencies)

---

## 1. Project Overview

SwissQuest is an AI-powered Swiss tourism activity search chatbot. Users can ask natural language questions like:

- "I want to go hiking in Valais"
- "Family activities near Zurich for a weekend"
- "Adventure sports in summer"

The system parses these queries to extract structured filters (category, canton, duration, season) and searches the MySwitzerland Tourism API.

### Key Features

- **Dual NLP Parsing**: Choose between TF-IDF/Embeddings (fast, offline) or LLM (accurate, contextual)
- **Real-time Chat Interface**: Conversational UI with activity cards
- **Model Comparison**: Evaluate both models against a gold standard dataset
- **Fuzzy Metrics**: Non-binary evaluation using similarity degrees

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                              │
│                         (React + TypeScript)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │   ChatInterface   │     │   ActivityCard   │     │   ActivityDetail        │ │
│  └───────┬──────┘     └──────────────┘     └──────────────────────────┘ │
│          │                                                               │
│          ▼                                                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        NLP LAYER                                   │  │
│  │  ┌─────────────────────┐    ┌─────────────────────────────────┐   │  │
│  │  │   FUZZY LOGIC        │    │   LLM (Gemini 2.5 Flash)        │   │  │
│  │  │   (Client-side)      │    │   (Server-side Edge Function)   │   │  │
│  │  │                      │    │                                  │   │  │
│  │  │  ┌────────────────┐  │    │  ┌────────────────────────────┐ │   │  │
│  │  │  │ TF-IDF Engine  │  │    │  │ Lovable AI Gateway         │ │   │  │
│  │  │  └────────────────┘  │    │  │ (Gemini 2.5 Flash)         │ │   │  │
│  │  │  ┌────────────────┐  │    │  └────────────────────────────┘ │   │  │
│  │  │  │ HuggingFace    │  │    │                                  │   │  │
│  │  │  │ Embeddings     │  │    │                                  │   │  │
│  │  │  └────────────────┘  │    │                                  │   │  │
│  │  └─────────────────────┘    └─────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    MySwitzerland API                               │  │
│  │                 (Tourism Activity Search)                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technologies

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | Latest | Pre-built UI components |
| React Router | 6.30.1 | Client-side routing |
| TanStack Query | 5.83.0 | Data fetching & caching |

### NLP Stack

| Technology | Purpose |
|------------|---------|
| TF-IDF (custom) | Term frequency-inverse document frequency |
| @huggingface/transformers | Browser-based embeddings model |
| mxbai-embed-xsmall-v1 | Embedding model (384 dimensions) |
| Gemini 2.5 Flash | LLM for contextual parsing |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| Supabase Edge Functions | Serverless Deno runtime |
| Lovable AI Gateway | Unified API for AI models |

---

## 4. NLP Parsing Approaches

### 4.1 Fuzzy Logic (TF-IDF + Embeddings)

The "Fuzzy Logic" model is actually a **hybrid TF-IDF and Semantic Embeddings** system that runs entirely in the browser.

#### Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FUZZY LOGIC PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Query: "I want to go hiking in Valais"                            │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 1: PREPROCESSING                                               │ │
│  │ - Lowercase: "i want to go hiking in valais"                        │ │
│  │ - Remove stopwords: "hiking valais"                                 │ │
│  │ - Stemming: "hike valai"                                            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 2: TF-IDF VECTORIZATION                                        │ │
│  │                                                                      │ │
│  │ Query Vector: [0.0, 0.8, 0.0, 0.6, ...]                            │ │
│  │                                                                      │ │
│  │ Category Documents (pre-computed):                                  │ │
│  │ - "hiking": [0.9, 0.7, 0.1, ...]                                   │ │
│  │ - "skiing": [0.1, 0.0, 0.9, ...]                                   │ │
│  │ - "wellness": [0.2, 0.1, 0.0, ...]                                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 3: COSINE SIMILARITY                                           │ │
│  │                                                                      │ │
│  │ similarity(query, hiking) = 0.85  ← BEST MATCH                     │ │
│  │ similarity(query, skiing) = 0.12                                   │ │
│  │ similarity(query, wellness) = 0.08                                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 4: CANTON EXTRACTION                                           │ │
│  │                                                                      │ │
│  │ Pattern matching: "valais" → canton: "Valais"                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  Output: { category: "hiking", canton: "Valais", confidence: 0.85 }    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Key Files

- `src/lib/nlpSemantic.ts` - Main orchestrator
- `src/lib/tfidf.ts` - TF-IDF algorithm implementation
- `src/lib/embeddings.ts` - HuggingFace model loader

#### Advantages

- ✅ Fast (~50-200ms)
- ✅ Free (no API costs)
- ✅ Works offline
- ✅ Deterministic (same input → same output)

#### Limitations

- ❌ Cannot understand synonyms not in vocabulary
- ❌ Struggles with context and ambiguity
- ❌ Requires manual category document definitions

---

### 4.2 LLM (Gemini 2.5 Flash)

The LLM model uses **Google Gemini 2.5 Flash** via a Supabase Edge Function.

#### Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            LLM PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Query: "romantic weekend getaway near a lake"                     │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 1: CLIENT REQUEST                                              │ │
│  │                                                                      │ │
│  │ POST /functions/v1/parse-query-llm                                  │ │
│  │ Body: { "query": "romantic weekend getaway near a lake" }           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 2: EDGE FUNCTION (Deno)                                        │ │
│  │                                                                      │ │
│  │ System Prompt:                                                       │ │
│  │ "You are a Swiss tourism query parser. Extract filters from         │ │
│  │  natural language queries. Return JSON with:                        │ │
│  │  - category, canton, duration, season                               │ │
│  │  - confidence score (0-1)"                                          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 3: LOVABLE AI GATEWAY                                          │ │
│  │                                                                      │ │
│  │ URL: https://ai.gateway.lovable.dev/v1/chat/completions             │ │
│  │ Model: google/gemini-2.5-flash                                      │ │
│  │ Auth: Bearer LOVABLE_API_KEY (auto-configured)                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 4: GEMINI RESPONSE                                             │ │
│  │                                                                      │ │
│  │ {                                                                    │ │
│  │   "category": "wellness",                                           │ │
│  │   "canton": null,                                                   │ │
│  │   "duration": "weekend",                                            │ │
│  │   "season": null,                                                   │ │
│  │   "keywords": ["romantic", "lake", "getaway"],                      │ │
│  │   "confidence": 0.78                                                │ │
│  │ }                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  Output: ParsedQuery object with extracted filters                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Key Files

- `src/lib/nlpLLM.ts` - Client-side API caller
- `supabase/functions/parse-query-llm/index.ts` - Edge Function

#### Advantages

- ✅ Understands synonyms and context
- ✅ Handles ambiguous queries well
- ✅ No vocabulary limitations
- ✅ Can infer implicit meaning

#### Limitations

- ❌ Slow (~800-2000ms)
- ❌ Costs money (API usage)
- ❌ Requires internet connection
- ❌ Non-deterministic (may vary)

---

## 5. Fuzzy Metrics Calculation

### Why Fuzzy Metrics?

Traditional binary metrics use a threshold (e.g., similarity ≥ 0.6 = relevant). This loses information. Fuzzy metrics use the actual similarity values.

### String Similarity (Levenshtein Distance)

The foundation of fuzzy matching is the **Levenshtein distance** - the minimum number of single-character edits to transform one string into another.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LEVENSHTEIN DISTANCE EXAMPLE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  String A: "hiking"                                                     │
│  String B: "biking"                                                     │
│                                                                          │
│  Step 1: h → b (substitution)     Cost: 1                               │
│                                                                          │
│  Total Edit Distance: 1                                                  │
│  Max Length: 6                                                           │
│                                                                          │
│  Similarity = 1 - (distance / max_length)                               │
│             = 1 - (1 / 6)                                                │
│             = 0.833                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fuzzy Precision Formula

```
                    Σ (similarity of each returned activity)
Fuzzy Precision = ─────────────────────────────────────────────
                         total number of returned activities
```

**Example:**

```
Returned Activities:
  1. "Hiking in Zermatt"     → best match similarity: 0.95
  2. "Mountain Biking"       → best match similarity: 0.55
  3. "City Tour Zurich"      → best match similarity: 0.00

Fuzzy Precision = (0.95 + 0.55 + 0.00) / 3 = 0.50
```

### Fuzzy Recall Formula

```
                  Σ (best match similarity for each expected activity)
Fuzzy Recall = ───────────────────────────────────────────────────────────
                         total number of expected activities
```

**Example:**

```
Expected Activities:
  1. "Hiking Trails"         → found with similarity: 0.95
  2. "Alpine Walking"        → not found, similarity: 0.00
  3. "Mountain Trekking"     → found with similarity: 0.55

Fuzzy Recall = (0.95 + 0.00 + 0.55) / 3 = 0.50
```

### F1-Score Formula

```
                   2 × Precision × Recall
F1-Score = ─────────────────────────────────────
                   Precision + Recall
```

Using the examples above:

```
F1-Score = 2 × 0.50 × 0.50 / (0.50 + 0.50) = 0.50
```

### Implementation Location

- `src/lib/textMatching.ts` - `calculateFuzzyPrecisionRecall()`
- `src/lib/metricsComparison.ts` - `evaluateQueryWithModel()`

---

## 6. Project Structure

### Detailed File Descriptions

```
src/
├── components/
│   ├── ChatInterface.tsx       # Chat container with message list and input
│   ├── ChatMessage.tsx         # Renders user/assistant/activity messages
│   ├── ActivityCard.tsx        # Card displaying activity preview
│   ├── ActivityDetail.tsx      # Modal with full activity details
│   ├── Hero.tsx                # Hero banner with Swiss Alps image
│   └── ui/                     # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (50+ components)
│
├── lib/
│   ├── nlp.ts                  # Entry point: routes to fuzzy or LLM
│   ├── nlpLLM.ts               # Calls Edge Function for LLM parsing
│   ├── nlpSemantic.ts          # TF-IDF + embeddings orchestrator
│   ├── tfidf.ts                # TF-IDF algorithm:
│   │                           #   - tokenize()
│   │                           #   - stem()
│   │                           #   - calculateTFIDF()
│   │                           #   - cosineSimilarity()
│   ├── embeddings.ts           # HuggingFace model:
│   │                           #   - loadEmbeddingModel()
│   │                           #   - generateEmbedding()
│   ├── textMatching.ts         # Fuzzy metrics:
│   │                           #   - levenshteinDistance()
│   │                           #   - calculateStringSimilarity()
│   │                           #   - calculateFuzzyPrecisionRecall()
│   ├── metrics.ts              # Single query evaluation
│   ├── metricsComparison.ts    # Full comparison runner
│   ├── metricsLiveAPI.ts       # Live API utilities
│   ├── api.ts                  # MySwitzerland API client
│   └── utils.ts                # Tailwind class merger
│
├── data/
│   └── goldStandardDataset.ts  # 15 test queries:
│                               #   - Query text
│                               #   - Expected filters
│                               #   - Expected activity names
│                               #   - Query type (simple/ambiguous/edge-case)
│
├── pages/
│   ├── Index.tsx               # Main page with:
│   │                           #   - Model toggle (Fuzzy/LLM/Compare)
│   │                           #   - Chat interface
│   │                           #   - Test API button
│   │                           #   - Run Comparison button
│   └── NotFound.tsx            # 404 page
│
├── hooks/
│   ├── use-mobile.tsx          # Mobile detection hook
│   └── use-toast.ts            # Toast notification hook
│
└── integrations/
    └── supabase/
        ├── client.ts           # Supabase client (auto-generated)
        └── types.ts            # Database types (auto-generated)

supabase/
├── config.toml                 # Supabase configuration
└── functions/
    └── parse-query-llm/
        └── index.ts            # Edge Function:
                                #   - CORS handling
                                #   - Prompt engineering
                                #   - Gemini API call
                                #   - JSON response parsing
```

---

## 7. API Reference

### MySwitzerland API

**Endpoint**: `https://www.myswitzerland.com/api/search`

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search keywords |
| `category` | string | Activity category |
| `canton` | string | Swiss canton |
| `duration` | string | Activity duration |
| `season` | string | Season filter |

**Response**: Array of activity objects

### Edge Function: parse-query-llm

**Endpoint**: `POST /functions/v1/parse-query-llm`

**Request Body**:
```json
{
  "query": "I want to go hiking in Valais"
}
```

**Response**:
```json
{
  "category": "hiking",
  "canton": "Valais",
  "duration": null,
  "season": "summer",
  "keywords": ["hiking", "valais", "outdoor"],
  "confidence": 0.85
}
```

---

## 8. Deployment

### Local Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

1. Build the project: `npm run build`
2. Drag `dist/` folder to Netlify dashboard

### Self-Hosted

1. Build: `npm run build`
2. Serve `dist/` with any static file server (nginx, Apache, etc.)

---

## 9. Cloud Dependencies

### Lovable Cloud

This project is deployed on **Lovable Cloud**, which provides:

- **Supabase Edge Functions**: Serverless Deno runtime for backend logic
- **Auto-configured secrets**: `LOVABLE_API_KEY` is pre-provisioned
- **Lovable AI Gateway**: Unified access to AI models

### Gemini 2.5 Flash

The LLM parser uses Google's Gemini 2.5 Flash model via the Lovable AI Gateway:

- **Gateway URL**: `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Model ID**: `google/gemini-2.5-flash`
- **Features**: 
  - Fast inference (~1-2 seconds)
  - Good accuracy for structured extraction
  - JSON output support

### API Key Management

The `LOVABLE_API_KEY` is automatically configured in Lovable Cloud projects. No manual setup required.

---

## Converting to PDF

To convert this documentation to PDF, use one of these methods:

### Method 1: VS Code Extension

1. Install "Markdown PDF" extension
2. Open this file in VS Code
3. Press `Ctrl+Shift+P` → "Markdown PDF: Export (pdf)"

### Method 2: Pandoc (Command Line)

```bash
pandoc docs/DOCUMENTATION.md -o docs/DOCUMENTATION.pdf
```

### Method 3: Online Converter

1. Copy the markdown content
2. Paste into [markdowntopdf.com](https://www.markdowntopdf.com/)
3. Download the PDF

---

**End of Documentation**
