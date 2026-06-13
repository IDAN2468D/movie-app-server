const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const geminiApiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const GEMINI_API_KEY = geminiApiKeyMatch ? geminiApiKeyMatch[1].trim() : '';

async function test() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: "A futuristic city skyline at sunset" }],
          parameters: { sampleCount: 1, aspectRatio: "16:9" }
        })
      }
    );
    const data = await response.json();
    if (response.ok) {
      console.log("Success! Predictions length:", data?.predictions?.length);
      if (data?.predictions?.[0]?.bytesBase64Encoded) {
        console.log("Base64 bytes start with:", data.predictions[0].bytesBase64Encoded.slice(0, 50));
      } else {
        console.log("No image bytes. Full response:", JSON.stringify(data, null, 2));
      }
    } else {
      console.error("Error response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error calling Gemini Image API:", error.message);
  }
}
test();
