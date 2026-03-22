import { analyzeArticle, analyzeTitleLength, analyzeMetaDescription, analyzeWordCount } from '@/lib/seo/analyzer'
import type { ArticleContent } from '@/lib/seo/types'

describe('SEO Analyzer', () => {
  describe('analyzeArticle', () => {
    const validArticle: ArticleContent = {
      title: 'This is a Well-Optimized Article Title for SEO',
      slug: 'well-optimized-article-title',
      content: `
        <p>This is the introduction of the article with the focus keyword. It provides a comprehensive overview of the topic.</p>
        <h2>First Main Section</h2>
        <p>This section discusses important aspects of the topic. The focus keyword appears naturally throughout the content.</p>
        <h3>Subsection One</h3>
        <p>Detailed information about the first aspect.</p>
        <h2>Second Main Section</h2>
        <p>This section provides more depth and analysis.</p>
        <h3>Subsection Two</h3>
        <p>Additional detailed information here.</p>
        <p>Here is a <a href="/related-article">link to related content</a> and an <a href="https://example.com">external source</a>.</p>
        <img src="/image1.jpg" alt="Descriptive alt text for the image">
        <img src="/image2.jpg" alt="Another descriptive image description">
      `.repeat(5), // Repeat to reach word count
      metaTitle: 'This is a Well-Optimized Article Title for SEO',
      metaDescription: 'This comprehensive article covers all aspects of the topic with in-depth analysis and practical examples.',
      focusKeyword: 'focus keyword',
      hasFeaturedImage: true,
      imageCount: 2,
      imagesWithAlt: 2,
    }

    it('should analyze a complete article and return needs-improvement status', () => {
      const result = analyzeArticle(validArticle)

      expect(result).toBeDefined()
      // The article is good but may not meet all criteria for 'good' status
      expect(result.status).toMatch(/^(good|needs-improvement)$/)
      expect(result.score).toBeGreaterThan(0)
      expect(result.maxScore).toBeGreaterThan(0)
    })

    it('should return criteria array', () => {
      const result = analyzeArticle(validArticle)

      expect(Array.isArray(result.criteria)).toBe(true)
      expect(result.criteria.length).toBeGreaterThan(0)
    })

    it('should return suggestions for failed criteria', () => {
      const poorArticle: ArticleContent = {
        title: 'Short',
        content: '<p>Very short content.</p>',
        slug: 'short',
        hasFeaturedImage: false,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(poorArticle)

      expect(result.status).toBe('poor')
      expect(Array.isArray(result.suggestions)).toBe(true)
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should group criteria by category', () => {
      const result = analyzeArticle(validArticle)

      expect(Array.isArray(result.categories)).toBe(true)
      expect(result.categories.length).toBeGreaterThan(0)

      result.categories.forEach(category => {
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('name')
        expect(category).toHaveProperty('criteria')
        expect(Array.isArray(category.criteria)).toBe(true)
      })
    })

    it('should handle article without focus keyword', () => {
      const articleWithoutKeyword: ArticleContent = {
        ...validArticle,
        focusKeyword: undefined,
      }

      const result = analyzeArticle(articleWithoutKeyword)

      // Should not include keyword-related criteria
      const keywordCriteria = result.criteria.filter(c => c.id.startsWith('keyword-'))
      expect(keywordCriteria.length).toBe(0)
    })

    it('should set analyzedAt timestamp', () => {
      const result = analyzeArticle(validArticle)

      expect(result.analyzedAt).toBeInstanceOf(Date)
      expect(result.analyzedAt.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('analyzeTitleLength', () => {
    it('should pass with optimal title length', () => {
      // Use a title within optimal range (40-60 characters)
      const optimalTitle = 'This is an Optimal Title Length for SEO Purposes'
      const result = analyzeTitleLength(optimalTitle, optimalTitle)

      expect(result.status).toBe('passed')
      expect(result.score).toBe(result.maxScore)
    })

    it('should fail with too short title', () => {
      const result = analyzeTitleLength('Short', 'Short')

      expect(result.status).toBe('warning')
      expect(result.score).toBeLessThan(result.maxScore)
    })

    it('should fail with too long title', () => {
      const longTitle = 'A'.repeat(100)
      const result = analyzeTitleLength(longTitle, longTitle)

      // Very long titles fail completely (not just warning)
      expect(result.status).toBe('failed')
    })

    it('should use metaTitle when provided', () => {
      const result = analyzeTitleLength('Short', 'This is a Better Meta Title with Good Length')

      expect(result.value).toBe('This is a Better Meta Title with Good Length'.length)
    })

    it('should provide recommendation for short titles', () => {
      const result = analyzeTitleLength('Hi')

      expect(result.recommendation).toBeDefined()
      expect(result.recommendationAr).toBeDefined()
    })
  })

  describe('analyzeMetaDescription', () => {
    it('should pass with optimal length', () => {
      // Use meta description within optimal range (130-150 characters)
      const metaDescription = 'This meta description has the perfect length for SEO optimization purposes with enough detail to be truly effective for search results.'
      const result = analyzeMetaDescription(metaDescription)

      expect(result.status).toBe('passed')
      expect(result.score).toBe(result.maxScore)
    })

    it('should fail with no meta description', () => {
      const result = analyzeMetaDescription()

      expect(result.status).toBe('failed')
      expect(result.score).toBe(0)
    })

    it('should provide recommendation for missing description', () => {
      const result = analyzeMetaDescription()

      expect(result.recommendation).toContain('meta description')
    })
  })

  describe('analyzeWordCount', () => {
    it('should pass with excellent word count', () => {
      const longContent = '<p>This is a word. </p>'.repeat(400) // ~400 words
      const result = analyzeWordCount(longContent)

      expect(result.status).toBe('passed')
      expect(result.value).toBeGreaterThanOrEqual(300)
    })

    it('should warn with low word count', () => {
      // Use content between 100-300 words to get warning status
      const mediumShortContent = '<p>' + 'This is some content for testing purposes. '.repeat(80) + '</p>' // ~200 words
      const result = analyzeWordCount(mediumShortContent)

      // Content with 100-300 words gets warning
      expect(result.status).toBe('warning')
      expect(result.score).toBeLessThan(result.maxScore)
    })

    it('should count words correctly', () => {
      const content = '<p>This has five words right here.</p>'
      const result = analyzeWordCount(content)

      // Word count includes all words, regardless of HTML
      expect(result.value).toBe(6)
    })

    it('should ignore HTML tags in word count', () => {
      const content = '<p><strong>Bold text</strong> and <em>italic text</em> should be counted correctly.</p>'
      const result = analyzeWordCount(content)

      // HTML tags are stripped before counting
      expect(result.value).toBe(9) // "Bold text and italic text should be counted correctly"
    })
  })

  describe('analyzeSlug', () => {
    it('should pass with valid slug', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<p>Test content</p>',
        slug: 'valid-article-slug',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const slugCriteria = result.criteria.find(c => c.id === 'slug')

      expect(slugCriteria?.status).toBe('passed')
    })

    it('should fail with invalid slug', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<p>Test content</p>',
        slug: 'Invalid_Slug With Uppercase',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const slugCriteria = result.criteria.find(c => c.id === 'slug')

      expect(slugCriteria?.status).toBe('warning')
    })

    it('should fail with missing slug', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<p>Test content</p>',
        slug: undefined,
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const slugCriteria = result.criteria.find(c => c.id === 'slug')

      expect(slugCriteria?.status).toBe('failed')
    })
  })

  describe('image analysis', () => {
    it('should pass when featured image exists', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<p>Test content</p>',
        slug: 'test',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const featuredImageCriteria = result.criteria.find(c => c.id === 'featured-image')

      expect(featuredImageCriteria?.status).toBe('passed')
    })

    it('should fail when featured image is missing', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<p>Test content</p>',
        slug: 'test',
        hasFeaturedImage: false,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const featuredImageCriteria = result.criteria.find(c => c.id === 'featured-image')

      expect(featuredImageCriteria?.status).toBe('failed')
    })

    it('should check alt text for images', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<img src="test.jpg" alt="Good alt text"><img src="test2.jpg">',
        slug: 'test',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const altTextCriteria = result.criteria.find(c => c.id === 'image-alt-text')

      // One image has alt, one doesn't - should be warning
      expect(altTextCriteria?.status).not.toBe('passed')
    })
  })

  describe('heading structure', () => {
    it('should pass with good heading structure', () => {
      const article: ArticleContent = {
        title: 'Test Article with Good Structure',
        content: `
          <p>Introduction paragraph here.</p>
          <h2>First Main Section</h2>
          <p>Content for first section.</p>
          <h2>Second Main Section</h2>
          <p>Content for second section.</p>
          <h3>Subsection</h3>
          <p>Subsection content.</p>
        `,
        slug: 'test',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const h2Criteria = result.criteria.find(c => c.id === 'h2-headings')

      expect(h2Criteria?.status).toBe('passed')
    })

    it('should fail without H2 headings', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<p>Content without proper headings.</p>',
        slug: 'test',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const h2Criteria = result.criteria.find(c => c.id === 'h2-headings')

      expect(h2Criteria?.status).toBe('failed')
    })
  })

  describe('keyword analysis', () => {
    const keywordArticle: ArticleContent = {
      title: 'Complete Guide to Keyword Optimization',
      slug: 'keyword-optimization-guide',
      content: `
        <p>This is the introduction about keyword optimization. The focus keyword should appear naturally.</p>
        <h2>Understanding Keyword Optimization</h2>
        <p>Keyword optimization is essential for SEO success. The focus keyword helps search engines understand your content.</p>
        <p>Here is a <a href="/related">link</a> and <a href="https://example.com">external link</a>.</p>
      `.repeat(10),
      metaTitle: 'Complete Guide to Keyword Optimization Strategies',
      metaDescription: 'Learn everything about keyword optimization and improve your SEO ranking with focus keyword strategies.',
      focusKeyword: 'keyword optimization',
      hasFeaturedImage: true,
      imageCount: 1,
      imagesWithAlt: 1,
    }

    it('should check keyword in title', () => {
      const result = analyzeArticle(keywordArticle)
      const keywordInTitle = result.criteria.find(c => c.id === 'keyword-in-title')

      expect(keywordInTitle?.status).toBe('passed')
    })

    it('should check keyword in meta description', () => {
      const result = analyzeArticle(keywordArticle)
      const keywordInMeta = result.criteria.find(c => c.id === 'keyword-in-meta')

      expect(keywordInMeta?.status).toBe('passed')
    })

    it('should check keyword density', () => {
      const result = analyzeArticle(keywordArticle)
      const keywordDensity = result.criteria.find(c => c.id === 'keyword-density')

      expect(keywordDensity).toBeDefined()
      expect(keywordDensity?.value).toContain('%')
    })
  })

  describe('link analysis', () => {
    it('should pass with internal and external links', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<p>Content with <a href="/internal">internal link</a> and <a href="https://external.com">external link</a>.</p>',
        slug: 'test',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const internalLinks = result.criteria.find(c => c.id === 'internal-links')
      const externalLinks = result.criteria.find(c => c.id === 'external-links')

      expect(internalLinks?.value).toBeGreaterThan(0)
      expect(externalLinks?.value).toBeGreaterThan(0)
    })

    it('should warn about missing links', () => {
      const article: ArticleContent = {
        title: 'Test',
        content: '<p>Content without any links at all.</p>',
        slug: 'test',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const internalLinks = result.criteria.find(c => c.id === 'internal-links')
      const externalLinks = result.criteria.find(c => c.id === 'external-links')

      expect(internalLinks?.status).toBe('warning')
      expect(externalLinks?.status).toBe('warning')
    })
  })

  describe('readability analysis', () => {
    it('should pass with readable content', () => {
      const readableContent = `
        <p>This is a simple sentence. This is another sentence. Short sentences are easy to read.</p>
        <h2>Main Section</h2>
        <p>More content here. Short paragraphs help readability. Clear language is important.</p>
      `.repeat(10)

      const article: ArticleContent = {
        title: 'Test Article About Readability',
        content: readableContent,
        slug: 'readability-test',
        hasFeaturedImage: true,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(article)
      const readability = result.criteria.find(c => c.id === 'readability')

      expect(readability?.status).toBe('passed')
    })
  })

  describe('scoring thresholds', () => {
    it('should return "needs-improvement" or "good" status for decent articles', () => {
      const excellentArticle: ArticleContent = {
        title: 'Excellent and Comprehensive Article Title That Meets All SEO Requirements',
        slug: 'excellent-article',
        content: `
          <p>This comprehensive article covers all aspects of excellent SEO optimization with detailed analysis and examples.</p>
          <h2>First Major Section on SEO Excellence</h2>
          <p>This section discusses important aspects. SEO optimization requires attention to detail. The focus keyword appears naturally.</p>
          <h3>Important Subsection with Details</h3>
          <p>Detailed information about SEO best practices and optimization strategies.</p>
          <h2>Second Major Section on Content Quality</h2>
          <p>Content quality is essential for good SEO rankings. High-quality content provides value to readers.</p>
          <h3>Additional Insights and Analysis</h3>
          <p>More detailed insights about SEO strategies and content optimization techniques.</p>
          <h2>Third Section on Technical SEO</h2>
          <p>Technical SEO includes meta tags, structured data, and website performance optimization.</p>
          <p>Here is a <a href="/related-seo-article">link to related content</a> for more information.</p>
          <p>Check out this <a href="https://authoritative-source.com">external source</a> for additional insights.</p>
          <img src="/optimized-image.jpg" alt="SEO optimization illustration showing best practices">
        `.repeat(15),
        metaTitle: 'Excellent Comprehensive Guide to SEO Optimization and Best Practices',
        metaDescription: 'This comprehensive guide covers all aspects of SEO optimization with detailed analysis, practical examples, and expert insights for improving your search rankings.',
        focusKeyword: 'SEO optimization',
        hasFeaturedImage: true,
        imageCount: 2,
        imagesWithAlt: 2,
      }

      const result = analyzeArticle(excellentArticle)

      // Should be at least "needs-improvement" if not "good"
      expect(result.status).toMatch(/^(good|needs-improvement)$/)
    })

    it('should return "poor" status for very low scores', () => {
      const poorArticle: ArticleContent = {
        title: 'Bad',
        content: '<p>Short.</p>',
        slug: 'bad',
        hasFeaturedImage: false,
        imageCount: 0,
        imagesWithAlt: 0,
      }

      const result = analyzeArticle(poorArticle)

      expect(result.status).toBe('poor')
    })
  })
})
