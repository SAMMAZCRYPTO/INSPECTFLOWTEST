const API_KEY = process.env.GEMINI_API_KEY;

async function testModel(modelName) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        if (response.ok) {
            console.log(`✅ ${modelName} works!`);
            return true;
        } else {
            const err = await response.json();
            console.log(`❌ ${modelName} failed:`, err.error.message || err.error.status);
            return false;
        }
    } catch (e) {
        console.log(`❌ ${modelName} failed:`, e.message);
        return false;
    }
}

async function main() {
    console.log("Testing API Key...");
    await testModel("gemini-1.5-flash");
    await testModel("gemini-1.5-pro");
    await testModel("gemini-2.0-flash-lite-preview-02-05");
    await testModel("gemini-2.5-flash");
}

main();
