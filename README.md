# SwissQuest 🏔️

An AI-powered Swiss tourism activity search chatbot that uses dual NLP parsing approaches (TF-IDF + Embeddings vs LLM) to extract search filters from natural language queries.

## 🛠️ Technologies

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| NLP (Client) | TF-IDF, Hugging Face Transformers (mxbai-embed-xsmall-v1) |
| NLP (Server) | Gemini 2.5 Flash via Lovable AI Gateway |
| API | MySwitzerland Tourism API |
| Backend | Supabase Edge Functions (Deno) |

## 📁 Project Structure

```
src/
├── components/                 # React UI components
│   ├── ChatInterface.tsx       # Main chat UI with message handling
│   ├── ChatMessage.tsx         # Individual message rendering
│   ├── ActivityCard.tsx        # Activity result card display
│   ├── ActivityDetail.tsx      # Detailed activity modal
│   ├── Hero.tsx                # Hero banner component
│   └── ui/                     # shadcn/ui components (Button, Card, etc.)
│
├── lib/                        # Core business logic
│   ├── nlp.ts                  # Entry point - routes to Fuzzy or LLM parser
│   ├── nlpLLM.ts               # LLM parser client (calls Edge Function)
│   ├── nlpSemantic.ts          # TF-IDF + Embeddings logic
│   ├── tfidf.ts                # TF-IDF algorithm implementation
│   ├── embeddings.ts           # HuggingFace transformer model loader
│   ├── textMatching.ts         # Levenshtein distance & fuzzy metrics
│   ├── metrics.ts              # Single query evaluation
│   ├── metricsComparison.ts    # Fuzzy vs LLM comparison runner
│   ├── metricsLiveAPI.ts       # Live API evaluation utilities
│   └── api.ts                  # MySwitzerland API client
│
├── data/
│   └── goldStandardDataset.ts  # 15 test queries with expected results
│
├── pages/
│   ├── Index.tsx               # Main application page
│   └── NotFound.tsx            # 404 page
│
├── hooks/                      # Custom React hooks
└── integrations/
    └── supabase/               # Supabase client configuration

supabase/
└── functions/
    └── parse-query-llm/        # Edge Function for LLM parsing
        └── index.ts            # Gemini API call with prompt engineering
```

## 🚀 How to Run Locally

### Prerequisites
- Node.js 18+ 
- npm or bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd swissquest

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file (optional for local development):

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-key>
```

> **Note**: The Fuzzy Logic model works fully offline. LLM features require the Supabase Edge Function.

## 📦 Deployment

### Build for Production

```bash
npm run build
```

This generates a `dist/` folder with static files.

### Deploy to Static Hosting

The built files can be deployed to any static hosting provider:

- **Vercel**: `vercel deploy`
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Use `gh-pages` package
- **Any web server**: Serve the `dist/` folder

### Backend Requirements

For LLM features to work in production, you need:
1. A Supabase project with Edge Functions enabled
2. The `parse-query-llm` function deployed
3. `LOVABLE_API_KEY` configured as a secret

## 🧠 Algorithm Overview

### Dual NLP Approach

SwissQuest uses two different approaches to parse natural language queries:

#### 1. Fuzzy Logic (TF-IDF + Embeddings)

**Runs client-side in the browser.**

```
User Query → Tokenize → Stem → TF-IDF Vector → Cosine Similarity → Best Category Match
                                     ↓
                        OR: Embedding Model (mxbai-embed-xsmall-v1)
```

- **Speed**: ~50-200ms
- **Cost**: Free (runs locally)
- **Accuracy**: Good for explicit keywords
- **Deterministic**: Same input → same output

#### 2. LLM (Gemini 2.5 Flash)

**Runs server-side via Edge Function.**

```
User Query → Edge Function → Gemini API → Structured JSON → Parsed Filters
```

- **Speed**: ~800-2000ms
- **Cost**: API usage fees
- **Accuracy**: Excellent for context and synonyms
- **Non-deterministic**: May vary slightly

### Fuzzy Metrics Evaluation

Both models are evaluated using **fuzzy metrics** (not binary thresholds):

| Metric | Formula |
|--------|---------|
| **Fuzzy Precision** | `Σ(all similarities) / total returned` |
| **Fuzzy Recall** | `Σ(best match per expected) / total expected` |
| **F1-Score** | `2 × (P × R) / (P + R)` |

Similarity is calculated using **Levenshtein Distance**:

```
similarity = 1 - (edit_distance / max_length)
```

## ☁️ Cloud Dependencies

This project is hosted on **Lovable Cloud**, which provides:

| Service | Purpose |
|---------|---------|
| **Supabase Edge Functions** | Serverless backend for LLM parsing |
| **Lovable AI Gateway** | Access to Gemini 2.5 Flash without API key management |
| **Auto-configured secrets** | `LOVABLE_API_KEY` is pre-configured |

### Gemini 2.5 Flash

The LLM parser uses **Google Gemini 2.5 Flash** via the Lovable AI Gateway:

- **Endpoint**: `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Model**: `google/gemini-2.5-flash`
- **Features**: Fast inference, good accuracy, structured JSON output

### MySwitzerland API

Activity data is fetched from the official MySwitzerland Tourism API:

- **Endpoint**: `https://www.myswitzerland.com/api/search`
- **Data**: Swiss tourism activities with filters (category, canton, duration, etc.)

## 📊 Model Comparison

Click "Fuzzy vs LLM" in the app to run a comparison against 15 gold standard queries:

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPARISON RESULTS                        │
├─────────────────────────────────────────────────────────────┤
│ Metric              │ Fuzzy Logic    │ LLM (Gemini)         │
├─────────────────────────────────────────────────────────────┤
│ Avg Latency         │ ~100ms         │ ~1200ms              │
│ Avg Precision       │ 0.45           │ 0.52                 │
│ Avg Recall          │ 0.38           │ 0.48                 │
│ Avg F1-Score        │ 0.41           │ 0.50                 │
│ Filter Accuracy     │ 0.72           │ 0.85                 │
└─────────────────────────────────────────────────────────────┘
```

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request
