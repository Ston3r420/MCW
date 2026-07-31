const { GoogleGenAI, Type } = require('@google/genai');
const fs = require('fs');
const path = require('path');

/**
 * Uses Gemini 3.6 Flash multimodal vision to analyze layer assets
 * and compute optical alignment offsets (x, y, scale) so pieces fit naturally.
 */
async function aiAlignLayers({ character, activeLayerOnly = null, canvasSnapshot = null }) {
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

  // Load relevant image files from assets_raw
  const assetsDir = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'assets_raw');
  const imageParts = [];

  const layerMapping = [
    { key: 'marble', prefix: 'Marble' },
    { key: 'armsLegs', prefix: 'ArmsLegs' },
    { key: 'eyes', prefix: 'Eye' },
    { key: 'hat', prefix: 'Hat' },
  ];

  for (const layer of layerMapping) {
    const idx = character[layer.key] || 1;
    const filename = `${layer.prefix}${idx}.png`;
    const filePath = path.join(assetsDir, filename);
    if (fs.existsSync(filePath)) {
      const imgBuffer = fs.readFileSync(filePath);
      imageParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imgBuffer.toString('base64'),
        },
      });
    }
  }

  // If a canvas snapshot was provided by the frontend, add it as well
  if (canvasSnapshot && typeof canvasSnapshot === 'string' && canvasSnapshot.startsWith('data:image')) {
    const base64Data = canvasSnapshot.replace(/^data:image\/\w+;base64,/, '');
    imageParts.push({
      inlineData: {
        mimeType: 'image/png',
        data: base64Data,
      },
    });
  }

  const systemInstruction = `You are an expert digital artist and visual aligner for 2D layered wrestling marble characters.
A marble character consists of 4 stacked layers:
1. 'marble' (Body sphere, base layer)
2. 'armsLegs' (Wrestling limbs and boots/gloves)
3. 'eyes' (Facial eyes/expression)
4. 'hat' (Headwear, hair, or helmet)

Your task:
Analyze the provided layer images and compute optimal pixel offset transforms (x, y, scale) for alignment in a 1000x1000 canvas.
- x: horizontal offset in pixels (-300 to 300)
- y: vertical offset in pixels (-300 to 300)
- scale: scale factor (0.5 to 2.0, where 1.0 is default size)

Standard visual positioning rules:
- 'marble' is anchor: x: 0, y: 0, scale: 1.0
- 'eyes' should align on the upper-middle face of the marble (y is usually -30 to +20 depending on eye height)
- 'hat' should sit snug on top of the marble sphere (y is negative, e.g. -120 to -40)
- 'armsLegs' should frame the marble body (y is around -20 to +40, x around 0)

Return precise numeric values in the requested JSON structure.`;

  const promptText = activeLayerOnly
    ? `Analyze the layer images and calculate the ideal x, y, scale transform ONLY for the layer '${activeLayerOnly}' (item #${character[activeLayerOnly]}) so it fits seamlessly onto marble #${character.marble}.`
    : `Analyze all layer images (marble #${character.marble}, armsLegs #${character.armsLegs}, eyes #${character.eyes}, hat #${character.hat}) and calculate ideal x, y, scale transforms for each layer so the character is perfectly aligned and proportioned.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      { text: promptText },
      ...imageParts,
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transforms: {
            type: Type.OBJECT,
            properties: {
              marble: {
                type: Type.OBJECT,
                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, scale: { type: Type.NUMBER } },
                required: ['x', 'y', 'scale'],
              },
              armsLegs: {
                type: Type.OBJECT,
                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, scale: { type: Type.NUMBER } },
                required: ['x', 'y', 'scale'],
              },
              eyes: {
                type: Type.OBJECT,
                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, scale: { type: Type.NUMBER } },
                required: ['x', 'y', 'scale'],
              },
              hat: {
                type: Type.OBJECT,
                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, scale: { type: Type.NUMBER } },
                required: ['x', 'y', 'scale'],
              },
            },
          },
          explanation: { type: Type.STRING },
        },
        required: ['transforms'],
      },
    },
  });

  const text = (response.text || '').trim();
  return JSON.parse(text);
}

module.exports = { aiAlignLayers };
