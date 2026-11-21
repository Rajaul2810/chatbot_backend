const openai = require('../utils/openaiClient');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_BASE64_CHARS = 7_000_000; // ~5MB raw

function normalizeDataUrl(imageBase64, mimeType = 'image/jpeg') {
  const raw = String(imageBase64 || '').trim();
  if (!raw) {
    throw new Error('Image data is required.');
  }

  if (raw.startsWith('data:')) {
    const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      throw new Error('Invalid image data URL.');
    }
    const mime = match[1].toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      throw new Error('Only JPG, PNG, or WEBP images are allowed.');
    }
    if (match[2].length > MAX_BASE64_CHARS) {
      throw new Error('Image is too large. Please upload a smaller photo (max ~5MB).');
    }
    return raw;
  }

  const mime = String(mimeType || 'image/jpeg').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error('Only JPG, PNG, or WEBP images are allowed.');
  }
  if (raw.length > MAX_BASE64_CHARS) {
    throw new Error('Image is too large. Please upload a smaller photo (max ~5MB).');
  }
  return `data:${mime};base64,${raw}`;
}

async function extractHandwritingText(imageBase64, mimeType) {
  const dataUrl = normalizeDataUrl(imageBase64, mimeType);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'You are an OCR engine for IELTS handwriting. Extract English text exactly as written. Keep paragraph breaks. Do not correct grammar or spelling. If a word is unreadable, write [?]. Return plain text only—no markdown, no commentary.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all handwritten English text from this image.',
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'high',
            },
          },
        ],
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('Could not read any text from this image.');
  }

  return {
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

module.exports = {
  extractHandwritingText,
  normalizeDataUrl,
};
