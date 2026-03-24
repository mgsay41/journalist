/**
 * Generate URL-friendly slug from Arabic or English text
 */

export function generateSlug(text: string): string {
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, '');

  // Convert Arabic to phonetic Latin for URL-friendly slugs
  const arabicToLatin: Record<string, string> = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa',
    'ب': 'b', 'ة': 't', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
    'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
    'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
    'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
    'ي': 'y', 'ى': 'a',
  };

  // Transliterate Arabic to Latin
  let slug = cleanText.split('').map(char => {
    return arabicToLatin[char] || char;
  }).join('');

  // Convert to lowercase
  slug = slug.toLowerCase();

  // Remove special characters except spaces, hyphens, and alphanumeric
  slug = slug.replace(/[^\w\s-]/g, '');

  // Replace spaces and multiple hyphens with single hyphen
  slug = slug.replace(/[\s_]+/g, '-');
  slug = slug.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  slug = slug.trim();

  // Limit length
  if (slug.length > 100) {
    slug = slug.substring(0, 100).replace(/-[^-]*$/, '');
  }

  // Ensure slug is not empty
  if (!slug) {
    return `post-${Date.now()}`;
  }

  return slug;
}

/**
 * Generate unique slug by checking against existing slugs
 */
export async function generateUniqueSlug(
  text: string,
  checkExists: (slug: string) => Promise<boolean>,
  suffix = 0
): Promise<string> {
  const baseSlug = generateSlug(text);
  const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`;

  const exists = await checkExists(slug);
  if (exists) {
    return generateUniqueSlug(text, checkExists, suffix + 1);
  }

  return slug;
}

/**
 * Generate a unique English name by appending a numeric suffix when there is a conflict.
 * e.g. "Egypt" → "Egypt 2" → "Egypt 3"
 */
export async function generateUniqueNameEn(
  nameEn: string,
  checkExists: (name: string) => Promise<boolean>,
  suffix = 0
): Promise<string> {
  const candidate = suffix === 0 ? nameEn : `${nameEn} ${suffix + 1}`;

  const exists = await checkExists(candidate);
  if (exists) {
    return generateUniqueNameEn(nameEn, checkExists, suffix + 1);
  }

  return candidate;
}
