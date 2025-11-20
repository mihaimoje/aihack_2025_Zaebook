const axios = require('axios');
const Review = require('../models/review');

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
const LLM_MODEL = process.env.LLM_MODEL || "llama3";

const generateDiffPrompt = (diffContent) => `
You are an expert code reviewer.
**Rules:**
1. Analyze lines starting with (+). Ignore (-).
2. Classify issues as:
   - CRITICAL: Bugs, Security, Crashes.
   - SUGGESTION: Style, clean code.
3. Output JSON ONLY.

**Format:**
{
  "findings": [
    { "severity": "CRITICAL", "line_number": 10, "message": "Explanation..." }
  ]
}

**Diff:**
\`\`\`
${diffContent}
\`\`\`
`;

exports.reviewDiff = async (req, res) => {
    const { diff, repoName } = req.body;

    if (!diff) return res.status(400).json({ error: "No diff provided" });

    console.log("🤖 Processing Diff...");

    try {
        // 1. Call Ollama
        const aiResponse = await axios.post(OLLAMA_URL, {
            model: LLM_MODEL,
            prompt: generateDiffPrompt(diff),
            stream: false,
            format: "json"
        });

        // 2. Clean Output (Llama 3 often wraps JSON in markdown blocks)
        const rawText = aiResponse.data.response;
        // Remove ```json and ``` if present
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedData;
        try {
            parsedData = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error:", rawText);
            // Fallback to avoid crashing
            parsedData = { findings: [{ severity: "SUGGESTION", message: "AI output malformed. Check raw logs." }] };
        }

        // 3. Save to DB
        const newReview = await Review.create({
            repoName: repoName,
            diff: diff,
            findings: parsedData.findings || []
        });

        console.log(`✅ Review ${newReview._id} - Verdict: ${newReview.verdict}`);

        // 4. Send Response to Hook
        // CRITICAL: We send 'reviewId' so the hook can open the browser URL
        res.json({
            approved: newReview.verdict === 'APPROVED',
            reviewId: newReview._id,
            findings: newReview.findings
        });

    } catch (error) {
        console.error("❌ AI Controller Error:", error.message);
        // Fail Open: If server errors, let the commit pass so we don't block work
        res.status(500).json({ approved: true, error: "Server Error" });
    }
};