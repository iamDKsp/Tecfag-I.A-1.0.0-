import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log('Fetching available models...\n');

        // Try the models property if available
        if ((genAI as any).models) {
            const models = await (genAI as any).models.list();
            console.log('Available models:');
            console.log(JSON.stringify(models, null, 2));
        } else {
            console.log('Models list not available in this SDK version');
            console.log('\nTrying common model names...\n');

            const commonModels = [
                'gemini-pro',
                'models/gemini-pro',
                'gemini-1.5-flash',
                'models/gemini-1.5-flash',
                'gemini-1.5-pro',
                'models/gemini-1.5-pro',
            ];

            for (const modelName of commonModels) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent('Hello');
                    console.log(`✅ SUCCESS with: ${modelName}`);
                    break;
                } catch (e: any) {
                    console.log(`❌ ${modelName}: ${e.message.split('\n')[0]}`);
                }
            }
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

listModels();
