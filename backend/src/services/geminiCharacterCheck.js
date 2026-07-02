const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Path to the baked assets (relative to backend root, pointing into the frontend public folder)
const ASSETS_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'assets');

const LAYER_META = [
  { key: 'marble',   prefix: 'Marble'   },
  { key: 'armsLegs', prefix: 'ArmsLegs' },
  { key: 'eyes',     prefix: 'Eye'      },
  { key: 'hat',      prefix: 'Hat'      },
];

/**
 * Load a PNG from the assets directory and return a Gemini inline image part.
 */
function loadImagePart(prefix, index) {
  const filePath = path.join(ASSETS_DIR, `${prefix}${index}.png`);
  const data = fs.readFileSync(filePath);
  return {
    inlineData: {
      mimeType: 'image/png',
      data: data.toString('base64'),
    },
  };
}

/**
 * Ask Gemini Vision to look at the four asset layers and score how well they
 * compose into an MCW marble wrestler — round marble body, eyes on the face,
 * hat on top, arms/legs hanging below.
 *
 * Returns: { score: number (0–100), feedback: string, passed: boolean }
 * Never throws — on any error it returns a neutral pass so the save isn't blocked.
 */
async function checkCharacterWithGemini(characterData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[GeminiCheck] GEMINI_API_KEY not set — skipping check');
    return { score: null, feedback: null, passed: true };
  }

  const { marble, armsLegs, eyes, hat } = characterData;

  try {
    // Load each selected layer as an image part
    const imageParts = [
      loadImagePart('Marble',   marble),
      loadImagePart('ArmsLegs', armsLegs),
      loadImagePart('Eye',      eyes),
      loadImagePart('Hat',      hat),
    ];

    const prompt = `You are the official MCW (Marble Championship Wrestling) character checker.

I am showing you the 4 individual asset layers a viewer chose for their marble wrestler character:
1. Marble body (image 1)
2. Arms & Legs (image 2)  
3. Eyes (image 3)
4. Hat (image 4)

In MCW, all characters are composed of these exact 4 layers stacked together to form a marble wrestler:
- The marble is a round ball that forms the body/head
- The eyes are cartoon eyes that sit centered on the marble's face
- The hat sits on top of the marble
- The arms & legs hang out from the bottom/sides of the marble

When layered together correctly, the result looks like a fun cartoon marble character — like a round ball with a face, hat, and limbs. See the reference style: a big round marble with expressive eyes on its face, a hat sitting on top, and ballet-style or cartoony limbs extending from below.

Look at all 4 layers and score how well this combination will compose into a proper MCW marble wrestler (0–100). Consider:
- Are all 4 layers visually appropriate for their role?
- Will the eyes sit naturally on the marble face?
- Will the hat sit on top of the marble?
- Will the arms/legs extend naturally from the bottom?
- Does the overall color/style combination feel cohesive?

All combinations are valid — you are scoring quality and cohesion, NOT rejecting characters.
Be generous and encouraging. Scores should generally be 70–100 unless something is truly mismatched.

Write one short, fun, wrestling-hype sentence about their character for display to the viewer. Reference something specific about their look (color, hat style, eyes, vibe). Make it exciting and wrestling-themed!

Respond in this exact JSON format (no markdown, no extra text):
{"score": <number 0-100>, "feedback": "<one sentence hype message>", "passed": <true if score >= 60>}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps it anyway
    const clean = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(clean);

    console.log(`[GeminiCheck] Score: ${parsed.score} | ${parsed.feedback}`);

    return {
      score: typeof parsed.score === 'number' ? Math.round(parsed.score) : null,
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : null,
      passed: parsed.passed !== false,
    };
  } catch (err) {
    console.error('[GeminiCheck] Error:', err.message);
    // Fail open — never block a character save
    return { score: null, feedback: null, passed: true };
  }
}

module.exports = { checkCharacterWithGemini };
