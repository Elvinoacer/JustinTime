const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    const promo = await prisma.promoCode.upsert({
      where: { code: 'TEST50' },
      update: {},
      create: {
        code: 'TEST50',
        description: 'Test 50 KES OFF',
        type: 'FIXED_AMOUNT',
        value: 50,
        minOrderAmount: 100,
        startDate: new Date(),
        usageLimit: 100,
        perUserLimit: 5,
        isActive: true,
      },
    });
    console.log('Created promo:', promo);
    
    const promoPercent = await prisma.promoCode.upsert({
        where: { code: 'SAVE20' },
        update: {},
        create: {
          code: 'SAVE20',
          description: 'Save 20%',
          type: 'PERCENTAGE',
          value: 20, // 20%
          maxDiscountAmount: 1000,
          startDate: new Date(),
          usageLimit: 100,
          perUserLimit: 5,
          isActive: true,
        },
      });
      console.log('Created percentage promo:', promoPercent);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
