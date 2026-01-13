
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: 'dummy' });

console.log('Has embeddings?', 'embeddings' in groq ? 'Yes' : 'No');
if ('embeddings' in groq) {
    console.log('Embeddings keys:', Object.keys((groq as any).embeddings));
}
