import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT FOUND');

async function testWithFetch() {
    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
    ];

    for (const model of models) {
        console.log(`\nTesting ${model} with direct fetch...`);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Say hello'
                        }]
                    }]
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ SUCCESS with ${model}`);
                console.log('Response:', data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text');
                break;
            } else {
                console.log(`❌ FAILED with ${model}`);
                console.log('Status:', response.status, response.statusText);
                console.log('Error:', JSON.stringify(data, null, 2));
            }
        } catch (error: any) {
            console.log(`❌ ERROR with ${model}:`, error.message);
        }
    }
}

testWithFetch();
