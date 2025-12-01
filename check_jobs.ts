
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function checkJobs() {
  try {
    console.log('Checking jobs...');
    const totalJobs = await prisma.job.count();
    console.log(`Total jobs: ${totalJobs}`);

    const openJobs = await prisma.job.count({
      where: { status: 'OPEN' }
    });
    console.log(`Open jobs: ${openJobs}`);

    const jobs = await prisma.job.findMany({
      take: 5,
      include: {
        category: true,
        client: true
      }
    });

    console.log('Sample jobs:', JSON.stringify(jobs, null, 2));

  } catch (error) {
    console.error('Error checking jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJobs();
