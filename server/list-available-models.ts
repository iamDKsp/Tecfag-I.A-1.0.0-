import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT FOUND');

async function listAvailableModels() {
    console.log('\nFetching list of available models...\n');

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log('✅ Available models:\n');
            if (data.models && Array.isArray(data.models)) {
                data.models.forEach((model: any) => {
                    console.log(`- ${model.name}`);
                    if (model.supportedGenerationMethods) {
                        console.log(`  Methods: ${model.supportedGenerationMethods.join(', ')}`);
                    }
                });

                // Try to generate with the first available model
                console.log('\n\nTrying first available model...');
                const firstModel = data.models.find((m: any) =>
                    m.supportedGenerationMethods?.includes('generateContent')
                );

                if (firstModel) {
                    const modelName = firstModel.name.replace('models/', '');
                    console.log(`Testing with: ${modelName}\n`);
                    await testModel(modelName);
                }
            } else {
                console.log('No models found');
            }
        } else {
            console.log('❌ Failed to list models');
            console.log('Status:', response.status, response.statusText);
            console.log('Error:', JSON.stringify(data, null, 2));
        }
    } catch (error: any) {
        console.log('❌ ERROR:', error.message);
    }
}

async function testModel(modelName: string) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Say hello in Portuguese'
                    }]
                }]
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ SUCCESS!`);
            console.log('Response:', data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text');
        } else {
            console.log(`❌ FAILED`);
            console.log('Error:', JSON.stringify(data, null, 2));
        }
    } catch (error: any) {
        console.log(`❌ ERROR:`, error.message);
    }
}

listAvailableModels();
