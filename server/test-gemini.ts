import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';

// Load env from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing with API Key:', apiKey ? 'FOUND (' + apiKey.substring(0, 10) + '...)' : 'NOT FOUND');

async function testGemini() {
    if (!apiKey) {
        console.error('API Key is missing');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('Sending request to Gemini...');
        const result = await model.generateContent('Say hello');
        const response = await result.response;
        const text = response.text();
        console.log('SUCCESS! Response:', text);
    } catch (error: any) {
        console.error('FAILED!');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('Error details:', JSON.stringify(error.response, null, 2));
        }
    }
}

testGemini();
