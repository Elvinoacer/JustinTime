
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function checkServices() {
  try {
    console.log('Checking services...');
    const totalServices = await prisma.service.count();
    console.log(`Total services: ${totalServices}`);

    const activeServices = await prisma.service.count({
      where: { isActive: true }
    });
    console.log(`Active services: ${activeServices}`);

    const services = await prisma.service.findMany({
      take: 5,
      include: {
        category: true,
        provider: true
      }
    });

    console.log('Sample services:', JSON.stringify(services, null, 2));

  } catch (error) {
    console.error('Error checking services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServices();
