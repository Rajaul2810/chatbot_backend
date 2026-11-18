# Writing Feedback Upgrade — System Prompt & Deploy

## Deploy checklist

1. Deploy `chatbot_backend` to `chatbotbackend.mentorslearning.com`.
2. Confirm env: MongoDB URI + OpenAI key still set.
3. Smoke test API:
   - `POST /api/writing/question` (with phone/name as today)
   - `POST /api/writing` with a short essay → expect `score` (4 criteria) + `wordMistakes` + `nextFocus`
   - `POST /api/writing/history` → list
   - `POST /api/writing/history/:id` → full doc
   - `POST /api/writing/progress` → includes `recentScores` + `criterionAverages`
4. Deploy frontend.
5. Open `/ielts-writing`: submit → see criteria bars, mistakes, side-by-side, history list.
6. Open an **old** history item (pre-upgrade): UI still loads (legacy string parsers).

## Compatibility

- Old Mongo submissions without `wordMistakes` / `nextFocus` still work.
- API keeps legacy fields: `ReWriteCorrectWords`, `ReWriteCorrectSentences`, etc.
- Server recomputes overall band from the 4 criteria (nearest 0.5).

## Final system prompt (shipped in `services/writingService.js`)

The live prompt is built by `buildSystemPrompt({ userInput, question, taskType })`. Core contract:

```
You are a strict IELTS Writing examiner. Score using official IELTS Writing Band Descriptors.

Task type: {Task 1|Task 2}
Question prompt: {question}
Student writing: {userInput}

Scoring rules:
- Half-band scores only: 0, 0.5, ... 9.0
- Criteria: Task Achievement / Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy
- Be fair and specific; cite examples from the text
- Max 8 wordMistakes and 8 sentenceMistakes as { wrong, correct }
- topPriorities: exactly 3 short English tips
- nextFocus: weakest criterion + action + practiceTip
- AiGenerateWriting: "0%" … "100%"
- Legacy strings ReWriteCorrectWords / ReWriteCorrectSentences: ❌ wrong ❌ → ✅ correct ✅
- Return JSON ONLY (no markdown)

Required JSON includes:
score, detailedFeedback (strengths/weaknesses/suggestions per criterion),
wordMistakes, sentenceMistakes, topPriorities, nextFocus,
legacy AI fields, overallBandScore, generalFeedback
```

Server-side after the model returns:

- Strip markdown fences if present
- Clamp each criterion to half bands
- Recalculate overall = average of 4, round to nearest 0.5
- Fill empty arrays / nextFocus fallbacks so the app never crashes on partial JSON

## New API routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/writing` | Submit + evaluate (unchanged path, richer payload) |
| POST | `/api/writing/progress` | Progress + recentScores + criterionAverages |
| POST | `/api/writing/history` | Last N submissions summary |
| POST | `/api/writing/history/:id` | Full submission (owner-only) |
