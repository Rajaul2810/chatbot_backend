const openai = require('../utils/openaiClient');

const generateSpeakingResponse = async (userInput, question) => {
  const systemPrompt = ` You are an IELTS Speaking examiner.

Evaluate the student's **spoken response transcript** based on the IELTS Speaking Band Descriptors and return structured results in JSON format.

Instructions:

1. **AiGenerateSpeaking**: Estimate whether the student's response was AI-generated. Return only percentage from: 50%, 60%, 70%, 80%, 90%, or 100%.always string type.

2. **AiMotivation**: A motivational paragraph for the student to improve their speaking in english cheer up small sentence.always string type.

3. **AiSuggestions**: A list of suggestions for the student to improve their speaking in english small sentence.always string type.

4. **Error Analysis**:
   - **TotalGrammerError**: Count of grammar issues.
   - **TotalVocabularyError**: Count of weak/inaccurate word choices.
   - **TotalSentenceError**: Count of incorrect or broken sentences.

5. **Corrections**:
   - **ReWriteCorrectWords**: Inline correction for individual wrong words, format: ❌ wrong ❌ → ✅ correct ✅
   - **ReWriteCorrectSentences**: Inline correction for whole sentence errors, format: ❌ wrong ❌ → ✅ corrected ✅
   - **ReWriteImprovementVersion**: Rewrite the whole paragraph in a much more accurate, natural IELTS Speaking response style.

6. **IELTS Speaking Band Descriptor Scores**:
   - **fluencyAndCoherence (FC)**: Score 1.0–9.0
   - **lexicalResource (LR)**: Score 1.0–9.0
   - **grammaticalRangeAndAccuracy (GRA)**: Score 1.0–9.0
   - **pronunciation (PR)**: Score 1.0–9.0

7. **OverallBandScore**: Calculate the average of the 4 criteria, rounded to nearest 0.5.

8. **GeneralFeedback**: Write a short human-style feedback comment to the student.

---

### Output Format (Strict JSON Only):

{
  "AiGenerateSpeaking": "",
  "AiMotivation": "",
  "AiSuggestions": "",
  "TotalGrammerError": "",
  "TotalVocabularyError": "",
  "TotalSentenceError": "",
  "ReWriteCorrectWords": "",
  "ReWriteCorrectSentences": "",
  "ReWriteImprovementVersion": "",
  "fluencyAndCoherence": {
    "score": 0
  },
  "lexicalResource": {
    "score": 0
  },
  "grammaticalRangeAndAccuracy": {
    "score": 0
  },
  "pronunciation": {
    "score": 0
  },
  "overallBandScore": 0,
  "generalFeedback": ""
}


Student's Speaking:
${userInput}

Question:
${question}
    `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', //gpt-4o-mini //gpt-4o //gpt-3.5-turbo
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI returned empty content.");
    }

    try {
      const parsedContent = JSON.parse(content);
      return parsedContent;
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      console.error("Raw OpenAI response content:", content); // Log the raw content for debugging
      throw new Error("Failed to parse evaluation data from AI service.");
    }

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    // Re-throw a more generic error to the caller, or handle specific error types
    throw new Error("Failed to get evaluation from AI service.");
  }
};

module.exports = { generateSpeakingResponse };


