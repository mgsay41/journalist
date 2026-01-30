import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log('Checking database...\n');

  const users = await prisma.user.findMany({
    include: { accounts: true },
  });

  console.log(`Total users: ${users.length}`);

  for (const user of users) {
    console.log('\n--- User ---');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log(`Accounts: ${user.accounts.length}`);

    for (const account of user.accounts) {
      console.log('\n--- Account ---');
      console.log('ID:', account.id);
      console.log('Provider ID:', account.providerId);
      console.log('Account ID:', account.accountId);
      console.log('Has Password:', !!account.password);
    }
  }

  await prisma.$disconnect();
}

check().catch(console.error);
