const { GoogleGenAI, Type } = require('@google/genai');

/**
 * Generate a complete wrestler character (Ring Name, Hometown, Bio, and Outfit layer indexes)
 * using Gemini 3.6 Flash.
 */
async function generateWrestlerWithAI(promptStyle = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `You are the chief creative director for Marbles Championship Wrestling (MCW).
MCW is a premier pro wrestling promotion where marbles are larger-than-life wrestling superstars.

Your job is to invent a creative, unforgettable pro wrestler gimmick and select their 4 outfit layer indices.

Layer Constraints:
- marble: integer index between 1 and 18 (marble body pattern/color)
- armsLegs: integer index between 1 and 6 (wrestling boots/gloves/limbs)
- eyes: integer index between 1 and 12 (expressive facial eyes)
- hat: integer index between 1 and 12 (headwear/hair/helmets)

Rules:
1. Ring name must be punchy and wrestling-themed (max 40 chars).
2. Hometown must be colorful (e.g. "Parts Unknown", "The Granite Canyons of Colorado", "Death Valley").
3. Bio must be 2-3 exciting sentences describing their wrestling style, gimmick, finisher, and personality.
4. Output MUST adhere to the JSON schema.`;

  const userPrompt = promptStyle && promptStyle.trim()
    ? `Create a wrestler character based on this style/theme: "${promptStyle.trim()}"`
    : `Create a unique, legendary marble wrestling superstar with a distinct heel, face, or wildcard gimmick!`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ringName: { type: Type.STRING },
          hometown: { type: Type.STRING },
          bio: { type: Type.STRING },
          characterData: {
            type: Type.OBJECT,
            properties: {
              marble: { type: Type.INTEGER },
              armsLegs: { type: Type.INTEGER },
              eyes: { type: Type.INTEGER },
              hat: { type: Type.INTEGER },
            },
            required: ['marble', 'armsLegs', 'eyes', 'hat'],
          },
        },
        required: ['ringName', 'hometown', 'bio', 'characterData'],
      },
    },
  });

  const text = (response.text || '').trim();
  const data = JSON.parse(text);

  // Clamp indices strictly to valid ranges
  data.characterData.marble = Math.max(1, Math.min(18, Math.round(data.characterData.marble || 1)));
  data.characterData.armsLegs = Math.max(1, Math.min(6, Math.round(data.characterData.armsLegs || 1)));
  data.characterData.eyes = Math.max(1, Math.min(12, Math.round(data.characterData.eyes || 1)));
  data.characterData.hat = Math.max(1, Math.min(12, Math.round(data.characterData.hat || 1)));

  return data;
}

module.exports = { generateWrestlerWithAI };
