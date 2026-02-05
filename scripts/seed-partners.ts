import { seedPartners } from "../src/lib/loyalty/partner-seeder";

async function main() {
  console.log("🏪 Seeding partner ecosystem...\n");
  
  try {
    const results = await seedPartners();
    
    console.log("✅ Partner seeding completed!");
    console.log(`   - Partners created: ${results.partnersCreated}`);
    console.log(`   - Rewards created: ${results.rewardsCreated}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding partners:", error);
    process.exit(1);
  }
}

main();
