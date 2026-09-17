import { generateThreatLandscape } from './services/geminiService.ts';

async function run() {
  try {
    const res = await generateThreatLandscape('Test Org', { startDate: '2023-01-01', endDate: '2023-03-31', name: 'Q1' }, 2, 'Focus on ransomware');
    console.log("SUCCESS:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("ERROR RUNNING GEN:", err);
  }
}
run();
