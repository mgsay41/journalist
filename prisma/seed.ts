import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data (in development)
  console.log('🧹 Cleaning existing data...');
  await prisma.video.deleteMany();
  await prisma.seoAnalysis.deleteMany();
  await prisma.image.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleaned existing data\n');

  // 1. Create Admin User
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'المدير العام',
      emailVerified: true,
      accounts: {
        create: {
          providerId: 'credential',
          accountId: 'admin@example.com',
          password: hashedPassword,
        },
      },
    },
  });
  console.log(`✅ Created admin user: ${admin.email}\n`);

  // 2. Create Categories (hierarchical structure)
  console.log('📁 Creating categories...');
  const techCategory = await prisma.category.create({
    data: {
      name: 'تقنية',
      slug: 'tech',
      description: 'مقالات عن التكنولوجيا والتقنية الحديثة',
    },
  });

  const aiCategory = await prisma.category.create({
    data: {
      name: 'الذكاء الاصطناعي',
      slug: 'artificial-intelligence',
      description: 'كل ما يتعلق بالذكاء الاصطناعي',
      parentId: techCategory.id,
    },
  });

  const politicsCategory = await prisma.category.create({
    data: {
      name: 'سياسة',
      slug: 'politics',
      description: 'المقالات السياسية والتحليلات',
    },
  });

  const sportsCategory = await prisma.category.create({
    data: {
      name: 'رياضة',
      slug: 'sports',
      description: 'الأخبار والمقالات الرياضية',
    },
  });

  console.log(`✅ Created ${4} categories\n`);

  // 3. Create Tags
  console.log('🏷️  Creating tags...');
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'تكنولوجيا', slug: 'technology' } }),
    prisma.tag.create({ data: { name: 'ذكاء اصطناعي', slug: 'ai' } }),
    prisma.tag.create({ data: { name: 'برمجة', slug: 'programming' } }),
    prisma.tag.create({ data: { name: 'أخبار', slug: 'news' } }),
    prisma.tag.create({ data: { name: 'تحليل', slug: 'analysis' } }),
    prisma.tag.create({ data: { name: 'robots', slug: 'robots' } }),
  ]);
  console.log(`✅ Created ${tags.length} tags\n`);

  // 4. Create Images
  console.log('🖼️  Creating images...');
  const image1 = await prisma.image.create({
    data: {
      url: 'https://example.com/images/tech-1.jpg',
      thumbnailUrl: 'https://example.com/images/tech-1-thumb.jpg',
      mediumUrl: 'https://example.com/images/tech-1-medium.jpg',
      largeUrl: 'https://example.com/images/tech-1-large.jpg',
      filename: 'tech-1.jpg',
      fileSize: 256000,
      width: 1920,
      height: 1080,
      mimeType: 'image/jpeg',
      altText: 'صورة تقنية حديثة',
      caption: 'تطور التكنولوجيا في العصر الحديث',
    },
  });

  const image2 = await prisma.image.create({
    data: {
      url: 'https://example.com/images/ai-robot.jpg',
      thumbnailUrl: 'https://example.com/images/ai-robot-thumb.jpg',
      mediumUrl: 'https://example.com/images/ai-robot-medium.jpg',
      largeUrl: 'https://example.com/images/ai-robot-large.jpg',
      filename: 'ai-robot.jpg',
      fileSize: 384000,
      width: 1920,
      height: 1080,
      mimeType: 'image/jpeg',
      altText: 'روبوت ذكي',
      caption: 'الذكاء الاصطناعي وتطور الروبوتات',
    },
  });
  console.log(`✅ Created 2 images\n`);

  // 5. Create Articles with different statuses
  console.log('📝 Creating articles...');

  // Published Article
  const publishedArticle = await prisma.article.create({
    data: {
      title: 'مستقبل الذكاء الاصطناعي في 2026',
      slug: 'future-of-ai-2026',
      content: `# مقدمة

يشهد العالم ثورة تقنية هائلة في مجال الذكاء الاصطناعي. في هذا المقال، سنستعرض أهم التطورات المتوقعة لعام 2026.

## التطورات الرئيسية

### 1. نماذج اللغة المتقدمة

تشهد نماذج اللغة الكبيرة تطوراً مذهلاً في قدراتها على فهم وإنتاج المحتوى باللغة العربية.

### 2. الروبوتات الذكية

يتزايد استخدام الروبوتات في مختلف المجالات، من الصناعة إلى الخدمات الصحية.

## الخاتمة

نستطيع القول إن مستقبل الذكاء الاصطناعي واعد جداً، ونحن على أعتاب عصر جديد من التكنولوجيا.`,
      excerpt: 'نظرة شاملة على مستقبل الذكاء الاصطناعي والتطورات المتوقعة لعام 2026',
      status: 'published',
      publishedAt: new Date('2025-01-15T10:00:00Z'),
      authorId: admin.id,
      featuredImageId: image2.id,
      views: 1250,
      seoScore: 85,
      metaTitle: 'مستقبل الذكاء الاصطناعي في 2026 | اسم الموقع',
      metaDescription: 'نظرة شاملة على مستقبل الذكاء الاصطناعي والتطورات المتوقعة لعام 2026 في هذا المقال الشامل.',
      focusKeyword: 'الذكاء الاصطناعي',
      categories: {
        connect: [
          { id: techCategory.id },
          { id: aiCategory.id },
        ],
      },
      tags: {
        connect: [
          { id: tags[1].id }, // ذكاء اصطناعي
          { id: tags[5].id }, // robots
        ],
      },
      images: {
        connect: [
          { id: image1.id },
          { id: image2.id },
        ],
      },
      seoAnalysis: {
        create: {
          score: 85,
          suggestions: [
            {
              type: 'improvement',
              priority: 'medium',
              message: 'إضافة المزيد من الروابط الداخلية قد يحسن SEO',
            },
          ],
          criteria: {
            titleLength: { pass: true, current: 35, target: '40-60' },
            metaDescriptionLength: { pass: true, current: 95, target: '120-160' },
            wordCount: { pass: true, current: 150, target: '300+' },
            hasImages: { pass: true, count: 2 },
            hasInternalLinks: { pass: false, count: 0 },
          },
        },
      },
    },
  });

  // Draft Article
  const draftArticle = await prisma.article.create({
    data: {
      title: 'تحليل الأوضاع السياسية في المنطقة',
      slug: 'political-analysis-region',
      content: 'محتوى المقال قيد الكتابة...',
      excerpt: 'تحليل شامل للأوضاع السياسية الراهنة',
      status: 'draft',
      authorId: admin.id,
      categories: {
        connect: [{ id: politicsCategory.id }],
      },
      tags: {
        connect: [
          { id: tags[3].id }, // أخبار
          { id: tags[4].id }, // تحليل
        ],
      },
    },
  });

  // Scheduled Article
  const scheduledArticle = await prisma.article.create({
    data: {
      title: 'أهم أحداث كرة القدم هذا الأسبوع',
      slug: 'football-events-week',
      content: 'تغطية شاملة لمباريات الأسبوع...',
      excerpt: 'ملخص بأهم المباريات والنتائج المتوقعة',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      authorId: admin.id,
      categories: {
        connect: [{ id: sportsCategory.id }],
      },
      tags: {
        connect: [{ id: tags[3].id }], // أخبار
      },
      seoAnalysis: {
        create: {
          score: 65,
          suggestions: [
            {
              type: 'warning',
              priority: 'high',
              message: 'يجب تحسين العنوان ليكون جذاباً أكثر',
            },
          ],
          criteria: {
            titleLength: { pass: false, current: 38, target: '40-60' },
            wordCount: { pass: false, current: 10, target: '300+' },
          },
        },
      },
    },
  });

  console.log(`✅ Created 3 articles (published, draft, scheduled)\n`);

  // 6. Create Videos
  console.log('🎥 Creating videos...');
  await prisma.video.create({
    data: {
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtubeId: 'dQw4w9WgXcQ',
      title: 'مقدمة في الذكاء الاصطناعي',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      privacyMode: true,
      autoplay: false,
      position: 0,
      articleId: publishedArticle.id,
    },
  });

  await prisma.video.create({
    data: {
      youtubeUrl: 'https://www.youtube.com/watch?v=example2',
      youtubeId: 'example2',
      title: 'شرح الروبوتات الحديثة',
      thumbnail: 'https://img.youtube.com/vi/example2/maxresdefault.jpg',
      privacyMode: false,
      autoplay: true,
      startTime: 30,
      position: 1,
      articleId: publishedArticle.id,
    },
  });
  console.log('✅ Created 2 videos\n');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Seed Summary:');
  console.log(`   👤 Users:         1`);
  console.log(`   📁 Categories:    4 (with hierarchy)`);
  console.log(`   🏷️  Tags:          6`);
  console.log(`   🖼️  Images:        2`);
  console.log(`   📝 Articles:      3 (published, draft, scheduled)`);
  console.log(`   🎥 Videos:        2`);
  console.log(`   📊 SEO Analyses:  2`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Database seeded successfully!\n');
  console.log('🔐 Admin credentials:');
  console.log('   Email: admin@example.com');
  console.log('   Password: admin123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
