import {
  createArticleSchema,
  updateArticleSchema,
  deleteArticleSchema,
  articleStatusEnum,
  MAX_TAGS_PER_ARTICLE,
} from '@/lib/validations/article'

const validArticleData = {
  title: 'مقال اختبار',
  content: '<p>محتوى المقال</p>',
  status: 'draft' as const,
}

describe('createArticleSchema', () => {
  describe('title validation', () => {
    it('should accept a valid title', () => {
      const result = createArticleSchema.safeParse(validArticleData)
      expect(result.success).toBe(true)
    })

    it('should reject an empty title', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, title: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('عنوان المقال مطلوب')
      }
    })

    it('should reject a title exceeding 200 characters', () => {
      const result = createArticleSchema.safeParse({
        ...validArticleData,
        title: 'أ'.repeat(201),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/200/)
      }
    })
  })

  describe('slug validation', () => {
    it('should accept a valid slug', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, slug: 'my-article-123' })
      expect(result.success).toBe(true)
    })

    it('should reject a slug with uppercase letters', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, slug: 'My-Article' })
      expect(result.success).toBe(false)
    })

    it('should reject a slug with spaces', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, slug: 'my article' })
      expect(result.success).toBe(false)
    })

    it('should reject a slug with Arabic characters', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, slug: 'مقال-test' })
      expect(result.success).toBe(false)
    })

    it('should accept null slug (auto-generation)', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, slug: null })
      expect(result.success).toBe(true)
    })

    it('should accept undefined slug', () => {
      const { slug: _, ...dataWithoutSlug } = { ...validArticleData, slug: undefined }
      const result = createArticleSchema.safeParse(dataWithoutSlug)
      expect(result.success).toBe(true)
    })
  })

  describe('content validation', () => {
    it('should reject empty content', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, content: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('محتوى المقال مطلوب')
      }
    })
  })

  describe('status validation', () => {
    it('should default to draft when status is omitted', () => {
      const { status: _, ...dataWithoutStatus } = validArticleData
      const result = createArticleSchema.safeParse(dataWithoutStatus)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('draft')
      }
    })

    it('should accept all valid statuses', () => {
      for (const status of ['draft', 'published', 'scheduled', 'archived'] as const) {
        const result = createArticleSchema.safeParse({ ...validArticleData, status })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid status', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, status: 'deleted' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('حالة المقال غير صالحة')
      }
    })
  })

  describe('tag limit validation', () => {
    it('should accept up to MAX_TAGS_PER_ARTICLE tags', () => {
      const tags = Array.from({ length: MAX_TAGS_PER_ARTICLE }, (_, i) => `tag-id-${i}`)
      const result = createArticleSchema.safeParse({ ...validArticleData, tagIds: tags })
      expect(result.success).toBe(true)
    })

    it('should reject more than MAX_TAGS_PER_ARTICLE tags', () => {
      const tags = Array.from({ length: MAX_TAGS_PER_ARTICLE + 1 }, (_, i) => `tag-id-${i}`)
      const result = createArticleSchema.safeParse({ ...validArticleData, tagIds: tags })
      expect(result.success).toBe(false)
    })
  })

  describe('meta fields validation', () => {
    it('should reject metaTitle longer than 60 characters', () => {
      const result = createArticleSchema.safeParse({
        ...validArticleData,
        metaTitle: 'أ'.repeat(61),
      })
      expect(result.success).toBe(false)
    })

    it('should reject metaDescription longer than 200 characters', () => {
      const result = createArticleSchema.safeParse({
        ...validArticleData,
        metaDescription: 'أ'.repeat(201),
      })
      expect(result.success).toBe(false)
    })

    it('should accept metaTitle up to 60 characters', () => {
      const result = createArticleSchema.safeParse({
        ...validArticleData,
        metaTitle: 'أ'.repeat(60),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('excerpt validation', () => {
    it('should reject excerpt longer than 500 characters', () => {
      const result = createArticleSchema.safeParse({
        ...validArticleData,
        excerpt: 'أ'.repeat(501),
      })
      expect(result.success).toBe(false)
    })

    it('should accept null excerpt', () => {
      const result = createArticleSchema.safeParse({ ...validArticleData, excerpt: null })
      expect(result.success).toBe(true)
    })
  })
})

describe('updateArticleSchema', () => {
  it('should require id field', () => {
    const result = updateArticleSchema.safeParse({ title: 'مقال' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const idError = result.error.issues.find((i) => i.path.includes('id'))
      expect(idError).toBeDefined()
    }
  })

  it('should accept partial updates with only id', () => {
    const result = updateArticleSchema.safeParse({ id: 'cuid-12345' })
    expect(result.success).toBe(true)
  })

  it('should reject invalid slug in update', () => {
    const result = updateArticleSchema.safeParse({ id: 'cuid-12345', slug: 'INVALID SLUG' })
    expect(result.success).toBe(false)
  })
})

describe('deleteArticleSchema', () => {
  it('should require id', () => {
    const result = deleteArticleSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('should default permanent to false', () => {
    const result = deleteArticleSchema.safeParse({ id: 'cuid-12345' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.permanent).toBe(false)
    }
  })

  it('should accept permanent: true for hard delete', () => {
    const result = deleteArticleSchema.safeParse({ id: 'cuid-12345', permanent: true })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.permanent).toBe(true)
    }
  })
})

describe('articleStatusEnum', () => {
  it('should accept all valid statuses', () => {
    for (const status of ['draft', 'published', 'scheduled', 'archived']) {
      expect(articleStatusEnum.safeParse(status).success).toBe(true)
    }
  })

  it('should reject invalid statuses', () => {
    for (const status of ['pending', 'deleted', 'active', '']) {
      expect(articleStatusEnum.safeParse(status).success).toBe(false)
    }
  })
})
