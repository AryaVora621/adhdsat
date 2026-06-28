import { GoogleGenerativeAI } from '@google/generative-ai';

const DOMAINS = [
  'Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig',
  'Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'
];

let genAI = null;
const getClient = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

export async function getAdaptiveCriteria(userProfile) {
  const client = getClient();
  if (!client) return null;
  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const targetScore = userProfile.targetScore || 1400;
    const baseline = userProfile.baseline || { english: 0, math: 0 };
    const baselineTotal = (baseline.english || 0) + (baseline.math || 0);
    const gap = targetScore - baselineTotal;

    const subscoredSection = userProfile.subscores
      ? `\nPer-domain priority from uploaded score report (higher = more urgent to improve):\n${JSON.stringify(userProfile.subscores, null, 2)}`
      : '';

    const prompt = `You are an SAT prep coach helping a student improve their score.

Student baseline: R&W ${baseline.english || '?'}, Math ${baseline.math || '?'} (total ${baselineTotal || '?'})
Target score: ${targetScore} (gap: ${gap > 0 ? `+${gap} points needed` : 'already at target'})

Domain accuracy from last 30 questions (0.0-1.0 scale, null = no data yet):
${JSON.stringify(userProfile.domainAccuracy, null, 2)}

Weak areas flagged by student: ${JSON.stringify(userProfile.weakAreas)}${subscoredSection}

Pick ONE domain to practice next and an appropriate difficulty level.
- Prioritize domains with the largest gap between current performance and needed performance
- If subscores are provided, heavily weight high-priority domains
- Vary difficulty: start medium, go hard when accuracy > 75%, easy when accuracy < 40%
- Don't drill the same domain more than 3 questions in a row

Return ONLY valid JSON with no markdown: {"domain": "<domain>", "difficulty": "<easy|medium|hard>"}
Valid domains: ${DOMAINS.join(', ')}`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    const text = result.response.text().trim().replace(/```json|```/g, '');
    const parsed = JSON.parse(text);
    if (DOMAINS.includes(parsed.domain) && ['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function* streamExplanation(ctx) {
  const client = getClient();
  if (!client) {
    yield "Explanation streaming requires a Gemini API key. Please check your .env file.";
    return;
  }
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are an SAT tutor helping a student who answered incorrectly.

Question: ${ctx.questionText}
Student chose: ${ctx.selectedChoice}
Correct answer: ${ctx.correctAnswer}

Give a clear, step-by-step explanation of why the correct answer is right and why the student's choice was wrong. Be concise but thorough. Use numbered steps. Focus on the concept, not just the answer.`;

  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export async function analyzeScoreReport(base64Image, mimeType) {
  const client = getClient();
  if (!client) return null;
  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      {
        inlineData: { data: base64Image, mimeType: mimeType || 'image/jpeg' }
      },
      `This is an SAT score report image. Extract the scores and analyze which domains the student is weakest in.

Return ONLY valid JSON with no markdown:
{
  "english_score": <number 200-800>,
  "math_score": <number 200-800>,
  "weak_areas": [<domain names, ordered from weakest to strongest>],
  "subscores": {
    "<domain>": <priority 1-5 where 5 = most urgent to improve>
  }
}

Valid domain names: Algebra, Advanced Math, Problem Solving & Data Analysis, Geometry & Trig, Information & Ideas, Craft & Structure, Expression of Ideas, Standard English Conventions

For subscores: examine any subscores, cross-test scores, or performance indicators visible. If subscores aren't explicitly shown, infer from the overall section scores and any performance bands shown.
If you cannot confidently read a value, use 0 for scores, [] for weak_areas, and {} for subscores.`
    ]);
    const text = result.response.text().trim().replace(/```json|```/g, '');
    return JSON.parse(text);
  } catch {
    return null;
  }
}
