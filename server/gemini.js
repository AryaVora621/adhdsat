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
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are an SAT prep coach. A student is targeting a 1500-1550 SAT score.

Domain accuracy from last 30 questions (0-1 scale, null means no data yet):
${JSON.stringify(userProfile.domainAccuracy, null, 2)}

Weak areas flagged at onboarding: ${JSON.stringify(userProfile.weakAreas)}

Return ONLY valid JSON with no markdown: {"domain": "<one of the 8 SAT domains>", "difficulty": "<easy|medium|hard>"}
Pick the domain with the most room for improvement. Alternate between weak domains rather than drilling one repeatedly.
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
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([
      {
        inlineData: { data: base64Image, mimeType: mimeType || 'image/jpeg' }
      },
      `This is an SAT score report image. Extract the scores and return ONLY valid JSON with no markdown:
{"english_score": <number 200-800>, "math_score": <number 200-800>, "weak_areas": [<array of domain names from: Algebra, Advanced Math, Problem Solving & Data Analysis, Geometry & Trig, Information & Ideas, Craft & Structure, Expression of Ideas, Standard English Conventions>]}
If you cannot confidently read a value, use 0 for scores and [] for weak_areas.`
    ]);
    const text = result.response.text().trim().replace(/```json|```/g, '');
    return JSON.parse(text);
  } catch {
    return null;
  }
}
