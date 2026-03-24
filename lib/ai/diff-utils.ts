export interface DiffResult {
  type: 'unchanged' | 'modified' | 'added' | 'removed';
  tag: string;
  originalHtml?: string;
  rewrittenHtml?: string;
  originalText?: string;
  rewrittenText?: string;
}

export interface AiEditMark {
  id: string;
  originalText: string;
  aiText: string;
}

export interface ContentBlock {
  tag: string;
  text: string;
  html: string;
}

function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ');
}

function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeArabic(str1);
  const s2 = normalizeArabic(str2);

  if (s1 === s2) return 1;

  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length >= s2.length ? s1 : s2;
    return shorter.length / longer.length;
  }

  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w));

  if (commonWords.length === 0) return 0;

  return (commonWords.length * 2) / (words1.length + words2.length);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const blockPattern = /<(p|h[23]|blockquote|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = blockPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2];
    
    blocks.push({
      tag,
      text: stripHtml(content),
      html: match[0],
    });
  }

  return blocks;
}

export function computeParagraphDiff(
  originalHtml: string,
  rewrittenHtml: string
): DiffResult[] {
  const originalBlocks = extractBlocks(originalHtml);
  const rewrittenBlocks = extractBlocks(rewrittenHtml);
  const results: DiffResult[] = [];
  
  const usedOriginalIndices = new Set<number>();
  
  const similarityMatrix: number[][] = [];
  for (let i = 0; i < rewrittenBlocks.length; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < originalBlocks.length; j++) {
      similarityMatrix[i][j] = stringSimilarity(
        rewrittenBlocks[i].text,
        originalBlocks[j].text
      );
    }
  }
  
  for (let i = 0; i < rewrittenBlocks.length; i++) {
    const rewrittenBlock = rewrittenBlocks[i];
    
    let bestMatchIndex = -1;
    let bestSimilarity = 0;
    
    for (let j = 0; j < originalBlocks.length; j++) {
      if (!usedOriginalIndices.has(j) && similarityMatrix[i][j] > bestSimilarity) {
        bestSimilarity = similarityMatrix[i][j];
        bestMatchIndex = j;
      }
    }
    
    if (bestMatchIndex >= 0 && bestSimilarity >= 0.85) {
      usedOriginalIndices.add(bestMatchIndex);
      const originalBlock = originalBlocks[bestMatchIndex];
      
      if (bestSimilarity === 1) {
        results.push({
          type: 'unchanged',
          tag: rewrittenBlock.tag,
          originalHtml: originalBlock.html,
          rewrittenHtml: rewrittenBlock.html,
          originalText: originalBlock.text,
          rewrittenText: rewrittenBlock.text,
        });
      } else {
        results.push({
          type: 'modified',
          tag: rewrittenBlock.tag,
          originalHtml: originalBlock.html,
          rewrittenHtml: rewrittenBlock.html,
          originalText: originalBlock.text,
          rewrittenText: rewrittenBlock.text,
        });
      }
    } else {
      results.push({
        type: 'added',
        tag: rewrittenBlock.tag,
        rewrittenHtml: rewrittenBlock.html,
        rewrittenText: rewrittenBlock.text,
      });
    }
  }
  
  for (let j = 0; j < originalBlocks.length; j++) {
    if (!usedOriginalIndices.has(j)) {
      const originalBlock = originalBlocks[j];
      results.push({
        type: 'removed',
        tag: originalBlock.tag,
        originalHtml: originalBlock.html,
        originalText: originalBlock.text,
      });
    }
  }
  
  return results;
}

export function buildAiEditMarksFromDiff(
  diffResults: DiffResult[],
  _rewrittenHtml: string
): AiEditMark[] {
  const marks: AiEditMark[] = [];
  let markIndex = 0;

  for (const result of diffResults) {
    if (result.type === 'modified') {
      marks.push({
        id: `ai-edit-${markIndex}`,
        originalText: result.originalText || '',
        aiText: result.rewrittenText || '',
      });
      markIndex++;
    }
  }

  return marks;
}
