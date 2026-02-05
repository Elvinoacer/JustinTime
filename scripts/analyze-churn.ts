import { analyzeAllUsers } from "../src/lib/churn/churn-predictor";
import { autoTriggerReEngagement } from "../src/lib/churn/re-engagement";

async function main() {
  console.log("🔍 Starting daily churn analysis...\n");
  
  try {
    // Step 1: Analyze all users
    console.log("📊 Analyzing all users...");
    const analysisResults = await analyzeAllUsers();
    
    console.log("✅ Analysis complete!");
    console.log(`   - Analyzed: ${analysisResults.analyzed} users`);
    console.log(`   - At Risk: ${analysisResults.atRisk} users`);
    console.log(`   - LOW: ${analysisResults.byLevel.LOW}`);
    console.log(`   - MEDIUM: ${analysisResults.byLevel.MEDIUM}`);
    console.log(`   - HIGH: ${analysisResults.byLevel.HIGH}`);
    console.log(`   - CRITICAL: ${analysisResults.byLevel.CRITICAL}\n`);
    
    // Step 2: Auto-trigger re-engagement for high-risk users
    console.log("📧 Triggering re-engagement campaigns...");
    const reEngagementResults = await autoTriggerReEngagement();
    
    console.log("✅ Re-engagement complete!");
    console.log(`   - Triggered: ${reEngagementResults.triggered}`);
    console.log(`   - Successful: ${reEngagementResults.successful}`);
    console.log(`   - Failed: ${reEngagementResults.failed}\n`);
    
    console.log("🎉 Churn analysis completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during churn analysis:", error);
    process.exit(1);
  }
}

main();
