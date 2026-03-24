import { generateContent } from '@/lib/gemini';

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export interface TranslationResult {
  slugBase: string;
  nameEn: string | null;
}

/**
 * Translates Arabic text to English for use in URL slugs and English name field.
 * Returns the original text unchanged if it contains no Arabic.
 * Falls back to the original text if the AI call fails.
 */
export async function translateToSlug(text: string): Promise<string> {
  const result = await translateToSlugWithEn(text);
  return result.slugBase;
}

/**
 * Translates Arabic text to English, returning both slug-ready text and the raw English name.
 * Returns the original text for slugBase and null for nameEn if no Arabic is present.
 * Falls back gracefully if the AI call fails.
 */
export async function translateToSlugWithEn(text: string): Promise<TranslationResult> {
  if (!hasArabic(text)) {
    return { slugBase: text, nameEn: null };
  }

  try {
    const result = await generateContent(
      `Translate the following Arabic term to English for use as a URL slug. Return ONLY the English translation — no explanation, no punctuation, no extra words. Keep it concise (1-3 words). Arabic term: "${text}"`,
      { maxTokens: 50, temperature: 0.1, useCache: true }
    );
    const rawTranslation = result.text.trim();
    const slugBase = rawTranslation
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim();
    
    if (slugBase) {
      return { 
        slugBase, 
        nameEn: rawTranslation 
      };
    }
  } catch {
    // Fall back to original text (transliteration will run on it)
  }

  return { slugBase: text, nameEn: null };
}
