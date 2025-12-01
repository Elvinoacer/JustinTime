
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function seedData() {
  try {
    console.log('Seeding data...');

    // Get a client user
    const client = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    });

    if (!client) {
      console.error('No client user found. Please create a client user first.');
      return;
    }

    // Get a provider user
    const provider = await prisma.user.findFirst({
      where: { role: 'PROVIDER' }
    });

    if (!provider) {
      console.error('No provider user found. Please create a provider user first.');
      return;
    }

    // Get categories
    const categories = await prisma.category.findMany();
    if (categories.length === 0) {
      console.error('No categories found. Please seed categories first.');
      return;
    }

    // Create Jobs
    console.log('Creating jobs...');
    await prisma.job.createMany({
      data: [
        {
          title: 'Fix Leaky Faucet',
          description: 'Need a plumber to fix a leaky faucet in the kitchen.',
          budget: 50,
          location: 'Nairobi, Kenya',
          categoryId: categories[0].id,
          clientId: client.id,
          status: 'OPEN',
          postedAt: new Date(),
        },
        {
          title: 'Paint Living Room',
          description: 'Looking for a painter to paint my living room walls.',
          budget: 150,
          location: 'Mombasa, Kenya',
          categoryId: categories[1] ? categories[1].id : categories[0].id,
          clientId: client.id,
          status: 'OPEN',
          postedAt: new Date(),
        }
      ]
    });
    console.log('Jobs created.');

    // Create Services
    console.log('Creating services...');
    // Check if provider already has services to avoid duplicates if run multiple times
    const existingServices = await prisma.service.count({
      where: { providerId: provider.id }
    });

    if (existingServices === 0) {
      await prisma.service.createMany({
        data: [
          {
            title: 'Professional Plumbing',
            description: 'Expert plumbing services for all your needs.',
            price: 30,
            pricingUnit: 'hour',
            categoryId: categories[0].id,
            providerId: provider.id,
            isActive: true,
            images: ['https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&q=80&w=1000'],
          },
          {
            title: 'Interior Painting',
            description: 'High-quality interior painting with premium paints.',
            price: 50,
            pricingUnit: 'room',
            categoryId: categories[1] ? categories[1].id : categories[0].id,
            providerId: provider.id,
            isActive: true,
            images: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1000'],
          }
        ]
      });
      console.log('Services created.');
    } else {
      console.log('Provider already has services, skipping creation.');
    }

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
