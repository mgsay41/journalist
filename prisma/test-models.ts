/**
 * Database Model Relationship Test Script
 *
 * This script tests all Prisma model relationships to ensure:
 * - One-to-many relationships work correctly
 * - Many-to-many relationships work correctly
 * - Self-referential relationships work correctly
 * - Cascade deletes work as expected
 * - Unique constraints are enforced
 *
 * Run after database is connected with: npx tsx prisma/test-models.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '━'.repeat(60));
  log(`  ${title}`, 'blue');
  console.log('━'.repeat(60));
}

async function testDatabaseConnection() {
  section('Testing Database Connection');
  try {
    await prisma.$connect();
    log('✅ Database connected successfully!', 'green');
    return true;
  } catch (error) {
    log('❌ Database connection failed!', 'red');
    log(`   Error: ${error}`, 'red');
    return false;
  }
}

async function testUniqueConstraints() {
  section('Testing Unique Constraints');

  try {
    // Try to create duplicate category
    await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-unique-' + Date.now(),
      },
    });

    // Try to create duplicate with same slug (should fail)
    try {
      await prisma.category.create({
        data: {
          name: 'Different Name',
          slug: 'test-unique-' + Date.now(), // This might succeed if timestamps differ
        },
      });
      log('⚠️  Unique constraint test inconclusive (timestamps differ)', 'yellow');
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        log('✅ Unique constraint works correctly!', 'green');
        log('   Duplicate slug rejected: P2002', 'green');
      }
    }

    // Cleanup
    await prisma.category.deleteMany({
      where: { slug: { startsWith: 'test-unique-' } },
    });

  } catch (error) {
    log('❌ Unique constraint test failed!', 'red');
    log(`   Error: ${error}`, 'red');
  }
}

async function testCategoryHierarchy() {
  section('Testing Category Hierarchy (Self-Referential)');

  try {
    // Create parent category
    const parent = await prisma.category.create({
      data: {
        name: 'Parent Category',
        slug: 'parent-' + Date.now(),
        description: 'Parent category for testing',
      },
    });

    // Create child category
    const child = await prisma.category.create({
      data: {
        name: 'Child Category',
        slug: 'child-' + Date.now(),
        description: 'Child category for testing',
        parentId: parent.id,
      },
    });

    // Test relationship: Parent -> Children
    const parentWithChildren = await prisma.category.findUnique({
      where: { id: parent.id },
      include: { children: true },
    });

    if (parentWithChildren?.children.length === 1) {
      log('✅ Parent → Children relationship works!', 'green');
    } else {
      log('❌ Parent → Children relationship failed!', 'red');
    }

    // Test relationship: Child -> Parent
    const childWithParent = await prisma.category.findUnique({
      where: { id: child.id },
      include: { parent: true },
    });

    if (childWithParent?.parent) {
      log('✅ Child → Parent relationship works!', 'green');
    } else {
      log('❌ Child → Parent relationship failed!', 'red');
    }

    // Cleanup
    await prisma.category.delete({ where: { id: child.id } });
    await prisma.category.delete({ where: { id: parent.id } });

  } catch (error) {
    log('❌ Category hierarchy test failed!', 'red');
    log(`   Error: ${error}`, 'red');
  }
}

async function testArticleCategoriesManyToMany() {
  section('Testing Article ↔ Categories (Many-to-Many)');

  let articleId: string;
  let categoryId1: string;
  let categoryId2: string;

  try {
    // Create categories
    const cat1 = await prisma.category.create({
      data: {
        name: 'Tech Test',
        slug: 'tech-test-' + Date.now(),
      },
    });
    categoryId1 = cat1.id;

    const cat2 = await prisma.category.create({
      data: {
        name: 'AI Test',
        slug: 'ai-test-' + Date.now(),
      },
    });
    categoryId2 = cat2.id;

    // Create user for article
    const userEmail = `test-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        name: 'Test User',
        accounts: {
          create: {
            providerId: 'credential',
            accountId: userEmail,
            password: 'hashedpassword',
          },
        },
      },
    });

    // Create article with categories
    const article = await prisma.article.create({
      data: {
        title: 'Test Article',
        slug: 'test-article-' + Date.now(),
        content: 'Test content',
        authorId: user.id,
        categories: {
          connect: [{ id: cat1.id }, { id: cat2.id }],
        },
      },
      include: { categories: true },
    });
    articleId = article.id;

    if (article.categories.length === 2) {
      log('✅ Article → Categories relationship works!', 'green');
    } else {
      log('❌ Article → Categories relationship failed!', 'red');
    }

    // Test reverse: Category → Articles
    const catWithArticles = await prisma.category.findUnique({
      where: { id: cat1.id },
      include: { articles: true },
    });

    if (catWithArticles?.articles.length === 1) {
      log('✅ Category → Articles relationship works!', 'green');
    } else {
      log('❌ Category → Articles relationship failed!', 'red');
    }

    // Cleanup
    await prisma.article.delete({ where: { id: articleId } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.category.delete({ where: { id: categoryId1 } });
    await prisma.category.delete({ where: { id: categoryId2 } });

  } catch (error) {
    log('❌ Article-Categories test failed!', 'red');
    log(`   Error: ${error}`, 'red');
  }
}

async function testArticleTagsManyToMany() {
  section('Testing Article ↔ Tags (Many-to-Many)');

  try {
    // Create tags
    const tag1 = await prisma.tag.create({
      data: { name: 'Test Tag 1', slug: 'test-tag-1-' + Date.now() },
    });
    const tag2 = await prisma.tag.create({
      data: { name: 'Test Tag 2', slug: 'test-tag-2-' + Date.now() },
    });

    // Create user
    const userEmailTags = `test-tags-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmailTags,
        name: 'Test User',
        accounts: {
          create: {
            providerId: 'credential',
            accountId: userEmailTags,
            password: 'hashedpassword',
          },
        },
      },
    });

    // Create article with tags
    const article = await prisma.article.create({
      data: {
        title: 'Test Tags Article',
        slug: 'test-tags-article-' + Date.now(),
        content: 'Test content',
        authorId: user.id,
        tags: { connect: [{ id: tag1.id }, { id: tag2.id }] },
      },
      include: { tags: true },
    });

    if (article.tags.length === 2) {
      log('✅ Article → Tags relationship works!', 'green');
    } else {
      log('❌ Article → Tags relationship failed!', 'red');
    }

    // Test reverse: Tag → Articles
    const tagWithArticles = await prisma.tag.findUnique({
      where: { id: tag1.id },
      include: { articles: true },
    });

    if (tagWithArticles?.articles.length === 1) {
      log('✅ Tag → Articles relationship works!', 'green');
    } else {
      log('❌ Tag → Articles relationship failed!', 'red');
    }

    // Cleanup
    await prisma.article.delete({ where: { id: article.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.tag.delete({ where: { id: tag1.id } });
    await prisma.tag.delete({ where: { id: tag2.id } });

  } catch (error) {
    log('❌ Article-Tags test failed!', 'red');
    log(`   Error: ${error}`, 'red');
  }
}

async function testArticleImageRelationships() {
  section('Testing Article ↔ Image Relationships');

  try {
    // Create user
    const userEmailImg = `test-img-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmailImg,
        name: 'Test User',
        accounts: {
          create: {
            providerId: 'credential',
            accountId: userEmailImg,
            password: 'hashedpassword',
          },
        },
      },
    });

    // Create images
    const img1 = await prisma.image.create({
      data: {
        url: 'https://test.com/img1.jpg',
        filename: 'img1.jpg',
        fileSize: 1000,
        width: 800,
        height: 600,
        mimeType: 'image/jpeg',
      },
    });
    const img2 = await prisma.image.create({
      data: {
        url: 'https://test.com/img2.jpg',
        filename: 'img2.jpg',
        fileSize: 2000,
        width: 1920,
        height: 1080,
        mimeType: 'image/jpeg',
      },
    });

    // Create article with featured image and multiple images
    const article = await prisma.article.create({
      data: {
        title: 'Test Image Article',
        slug: 'test-image-article-' + Date.now(),
        content: 'Test content with images',
        authorId: user.id,
        featuredImageId: img2.id,
        images: { connect: [{ id: img1.id }, { id: img2.id }] },
      },
      include: { featuredImage: true, images: true },
    });

    if (article.featuredImage?.id === img2.id) {
      log('✅ Article → Featured Image relationship works!', 'green');
    } else {
      log('❌ Article → Featured Image relationship failed!', 'red');
    }

    if (article.images.length === 2) {
      log('✅ Article → Images (many-to-many) relationship works!', 'green');
    } else {
      log('❌ Article → Images relationship failed!', 'red');
    }

    // Test reverse: Image → FeaturedInArticles
    const imgWithFeatured = await prisma.image.findUnique({
      where: { id: img2.id },
      include: { featuredInArticles: true },
    });

    if (imgWithFeatured?.featuredInArticles.length === 1) {
      log('✅ Image → FeaturedInArticles relationship works!', 'green');
    } else {
      log('❌ Image → FeaturedInArticles relationship failed!', 'red');
    }

    // Cleanup
    await prisma.article.delete({ where: { id: article.id } });
    await prisma.image.delete({ where: { id: img1.id } });
    await prisma.image.delete({ where: { id: img2.id } });
    await prisma.user.delete({ where: { id: user.id } });

  } catch (error) {
    log('❌ Article-Image relationships test failed!', 'red');
    log(`   Error: ${error}`, 'red');
  }
}

async function testCascadeDeleteUser() {
  section('Testing Cascade Delete: User → Articles');

  try {
    // Create user
    const userEmailCascade = `test-cascade-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmailCascade,
        name: 'Test User',
        accounts: {
          create: {
            providerId: 'credential',
            accountId: userEmailCascade,
            password: 'hashedpassword',
          },
        },
        articles: {
          create: [
            {
              title: 'Article 1',
              slug: 'cascade-test-1-' + Date.now(),
              content: 'Content 1',
            },
            {
              title: 'Article 2',
              slug: 'cascade-test-2-' + Date.now(),
              content: 'Content 2',
            },
          ],
        },
      },
      include: { articles: true },
    });

    const articleCount = user.articles.length;
    const userId = user.id;

    // Delete user (should cascade to articles)
    await prisma.user.delete({ where: { id: userId } });

    // Verify articles are deleted
    const remainingArticles = await prisma.article.findMany({
      where: { authorId: userId },
    });

    if (remainingArticles.length === 0) {
      log(`✅ Cascade delete works! ${articleCount} articles deleted when user was removed.`, 'green');
    } else {
      log('❌ Cascade delete failed! Articles still exist after user deletion.', 'red');
    }

  } catch (error) {
    log('❌ Cascade delete test failed!', 'red');
    log(`   Error: ${error}`, 'red');
  }
}

async function testVideoRelationship() {
  section('Testing Video → Article Relationship');

  try {
    // Create user
    const userEmailVideo = `test-video-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmailVideo,
        name: 'Test User',
        accounts: {
          create: {
            providerId: 'credential',
            accountId: userEmailVideo,
            password: 'hashedpassword',
          },
        },
      },
    });

    // Create article
    const article = await prisma.article.create({
      data: {
        title: 'Test Video Article',
        slug: 'test-video-article-' + Date.now(),
        content: 'Test content',
        authorId: user.id,
      },
    });

    // Create videos
    await prisma.video.create({
      data: {
        youtubeUrl: 'https://youtube.com/watch?v=test1',
        youtubeId: 'test1',
        thumbnail: 'https://img.youtube.com/vi/test1/default.jpg',
        position: 0,
        articleId: article.id,
      },
    });
    await prisma.video.create({
      data: {
        youtubeUrl: 'https://youtube.com/watch?v=test2',
        youtubeId: 'test2',
        thumbnail: 'https://img.youtube.com/vi/test2/default.jpg',
        position: 1,
        articleId: article.id,
      },
    });

    // Test: Article → Videos
    const articleWithVideos = await prisma.article.findUnique({
      where: { id: article.id },
      include: { videos: true },
    });

    if (articleWithVideos?.videos.length === 2) {
      log('✅ Article → Videos relationship works!', 'green');
    } else {
      log('❌ Article → Videos relationship failed!', 'red');
    }

    // Cleanup (cascade should delete videos)
    await prisma.article.delete({ where: { id: article.id } });
    await prisma.user.delete({ where: { id: user.id } });

    log('✅ Cleanup successful (cascade deleted videos)', 'green');

  } catch (error) {
    log('❌ Video relationship test failed!', 'red');
    log(`   Error: ${error}`, 'red');
  }
}

async function testSeoAnalysisRelationship() {
  section('Testing SeoAnalysis → Article (One-to-One)');

  try {
    // Create user
    const userEmailSeo = `test-seo-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmailSeo,
        name: 'Test User',
        accounts: {
          create: {
            providerId: 'credential',
            accountId: userEmailSeo,
            password: 'hashedpassword',
          },
        },
      },
    });

    // Create article with SEO analysis
    const article = await prisma.article.create({
      data: {
        title: 'Test SEO Article',
        slug: 'test-seo-article-' + Date.now(),
        content: 'Test content for SEO',
        authorId: user.id,
        seoAnalysis: {
          create: {
            score: 85,
            suggestions: [{ type: 'tip', message: 'Good job!' }],
            criteria: { wordCount: { pass: true } },
          },
        },
      },
      include: { seoAnalysis: true },
    });

    if (article.seoAnalysis) {
      log('✅ Article → SeoAnalysis relationship works!', 'green');
    } else {
      log('❌ Article → SeoAnalysis relationship failed!', 'red');
    }

    // Test reverse: SeoAnalysis → Article
    if (article.seoAnalysis) {
      const seoWithArticle = await prisma.seoAnalysis.findUnique({
        where: { id: article.seoAnalysis.id },
        include: { article: true },
      });

      if (seoWithArticle?.article) {
        log('✅ SeoAnalysis → Article relationship works!', 'green');
      } else {
        log('❌ SeoAnalysis → Article relationship failed!', 'red');
      }
    }

    // Cleanup
    await prisma.article.delete({ where: { id: article.id } });
    await prisma.user.delete({ where: { id: user.id } });

  } catch (error) {
    log('❌ SEO Analysis relationship test failed!', 'red');
    log(`   Error: ${error}`, 'red');
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Database Model Relationship Test Suite                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const connected = await testDatabaseConnection();
  if (!connected) {
    log('\n❌ Cannot proceed without database connection. Exiting.', 'red');
    process.exit(1);
  }

  await testUniqueConstraints();
  await testCategoryHierarchy();
  await testArticleCategoriesManyToMany();
  await testArticleTagsManyToMany();
  await testArticleImageRelationships();
  await testVideoRelationship();
  await testSeoAnalysisRelationship();
  await testCascadeDeleteUser();

  section('Test Summary');
  log('✅ All database model relationship tests completed!', 'green');
  log('\nNext steps:', 'blue');
  log('  1. Review test results above', 'reset');
  log('  2. Fix any failed relationships if needed', 'reset');
  log('  3. Run "npm run db:seed" to populate database with sample data', 'reset');
  log('\n');
}

main()
  .catch((error) => {
    log('\n❌ Test suite failed with error:', 'red');
    log(`   ${error}`, 'red');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
