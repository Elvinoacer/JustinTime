
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function testServicesAPI() {
  try {
    console.log('Testing services API logic...\n');

    // Simulate the API query with default filters
    const where: any = {
      isActive: true,
    };

    console.log('Where clause:', JSON.stringify(where, null, 2));

    const services = await prisma.service.findMany({
      where,
      take: 12,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: {
                isVerified: true,
                latitude: true,
                longitude: true,
                location: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        bookings: {
          where: {
            review: { isNot: null }
          },
          select: {
            review: {
              select: {
                rating: true
              }
            }
          }
        }
      },
    });

    console.log(`\nFound ${services.length} active services`);
    
    if (services.length > 0) {
      console.log('\nSample service:', JSON.stringify(services[0], null, 2));
    } else {
      console.log('\nNo active services found. Checking inactive services...');
      const inactiveServices = await prisma.service.count({
        where: { isActive: false }
      });
      console.log(`Inactive services: ${inactiveServices}`);
      
      const anyServices = await prisma.service.findMany({ take: 1 });
      if (anyServices.length > 0) {
        console.log('\nSample of ANY service (active or not):', JSON.stringify(anyServices[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Error testing services API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testServicesAPI();
