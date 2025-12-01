
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function verifySkills() {
  try {
    console.log('Fetching profiles with skills...');
    const profiles = await prisma.profile.findMany({
      where: {
        skills: {
          isEmpty: false
        }
      },
      select: {
        userId: true,
        skills: true
      }
    });

    console.log(`Found ${profiles.length} profiles with skills.`);

    console.log('Fetching all categories...');
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    console.log(`Found ${categories.length} categories.`);

    for (const profile of profiles) {
      console.log(`\nChecking profile for user ${profile.userId}:`);
      const mappedSkills = profile.skills.map(skillId => {
        const name = categoryMap.get(skillId);
        if (name) {
          return `[MATCH] ${skillId} -> ${name}`;
        } else {
          return `[NO MATCH] ${skillId} (will display as ID)`;
        }
      });
      console.log(mappedSkills.join('\n'));
    }

  } catch (error) {
    console.error('Error verifying skills:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySkills();
