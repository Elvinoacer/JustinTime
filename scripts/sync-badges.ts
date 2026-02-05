import { syncBadgeDefinitions } from "../src/lib/gamification/badge-checker";

async function main() {
  console.log("🎯 Syncing badge definitions to database...\n");
  
  try {
    const results = await syncBadgeDefinitions();
    
    console.log("✅ Badge sync completed successfully!");
    console.log(`   - Created: ${results.created} badges`);
    console.log(`   - Updated: ${results.updated} badges`);
    console.log(`   - Total: ${results.total} badges\n`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error syncing badges:", error);
    process.exit(1);
  }
}

main();
