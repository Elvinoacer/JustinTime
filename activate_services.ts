
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function activateServices() {
  try {
    console.log('Activating all inactive services...\n');

    const result = await prisma.service.updateMany({
      where: {
        isActive: false
      },
      data: {
        isActive: true
      }
    });

    console.log(`✅ Activated ${result.count} service(s)`);

    // Verify
    const activeCount = await prisma.service.count({
      where: { isActive: true }
    });
    
    console.log(`\nTotal active services: ${activeCount}`);

  } catch (error) {
    console.error('Error activating services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateServices();
