import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function testGroq() {
    console.log('Testing Groq Integration...');
    console.log('API Key present:', !!process.env.GROQ_API_KEY);
    console.log('Provider:', process.env.AI_PROVIDER);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    try {
        console.log('Sending request to Llama 3.3 70B...');
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Hello! Are you working?' }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
        });

        console.log('Response received:');
        console.log(completion.choices[0]?.message?.content);
        console.log('SUCCESS! Groq authentication and generation working.');
    } catch (error: any) {
        console.error('FAILED:', error);
    }
}

testGroq();
