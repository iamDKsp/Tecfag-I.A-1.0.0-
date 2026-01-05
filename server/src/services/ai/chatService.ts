import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from './embeddings';
import { searchSimilarChunks } from './vectorDB';
import Groq from 'groq-sdk';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    response: string;
    sources: Array<{
        fileName: string;
        chunkIndex: number;
        similarity: number;
    }>;
}

/**
 * Answer a question using RAG (Retrieval Augmented Generation)
 */
export async function answerQuestion(
    question: string,
    catalogId?: string,
    chatHistory: ChatMessage[] = [],
    mode: 'direct' | 'casual' | 'educational' | 'professional' = 'educational',
    isTableMode: boolean = false
): Promise<ChatResponse> {
    try {
        console.log(`[ChatService] Processing question: ${question.substring(0, 50)}... (Mode: ${mode}, Provider: ${AI_PROVIDER})`);

        // 1. Generate embedding for the question
        const questionEmbedding = await generateEmbedding(question);

        // 2. Search for relevant chunks
        const relevantChunks = await searchSimilarChunks(
            questionEmbedding,
            12, // Reduced slightly to fit well within context windows while maintaining quality
            catalogId ? { catalogId } : undefined
        );

        console.log(`[ChatService] Found ${relevantChunks.length} relevant chunks`);

        if (relevantChunks.length === 0) {
            return {
                response: 'Não encontrei informações suficientes nos documentos para responder sua pergunta com a profundidade necessária. Tente adicionar mais documentos relacionados ou reformule a pergunta.',
                sources: []
            };
        }

        // 3. Build context from relevant chunks
        const context = relevantChunks
            .map((chunk, index) => {
                const metadata = chunk.metadata || {};
                return `[ID: ${index + 1} | Fonte: ${metadata.fileName || 'Documento'}]
${chunk.content}`;
            })
            .join('\n\n---\n\n');

        // 4. Build prompt based on Mode
        let systemPrompt = '';

        const baseContext = `
REGRAS DE FONTE (RAG):
- Baseie sua resposta ESTRITAMENTE nos documentos fornecidos abaixo.
- NÃO cite as fontes no texto da resposta (ex: "Segundo documento X"). As fontes serão apresentadas separadamente pela interface.
- Se a informação não estiver nos documentos, diga que não encontrou nos documentos.

DOCUMENTOS DE REFERÊNCIA:
${context}`;

        const tableInstruction = isTableMode
            ? `\n\nREQUISITO ESPECIAL DE FORMATAÇÃO:
- O usuário ATIVOU o "Modo Tabela".
- Você DEVE apresentar a resposta ou parte significativa dela em formato de TABELA MARKDOWN sempre que houver dados comparáveis ou listáveis.
- Se a pergunta for sobre comparação, diferenças, especificações ou listas, a tabela é OBRIGATÓRIA.
- Use colunas claras e objetivas.`
            : '';

        switch (mode) {
            case 'direct':
                systemPrompt = `CONTEXTO: Resposta técnica de alta densidade e zero gordura.
DIRETRIZES:
- Responda SÓ a pergunta.
- Use listas/tópicos sempre que possível.
- SEM introduções ou conclusões.
- Se for 'sim' ou 'não', comece com isso.
${baseContext}
${tableInstruction}
ESTRUTURA: Apenas os fatos.`;
                break;

            case 'casual':
                systemPrompt = `CONTEXTO: Você é um colega de equipe experiente ajudando outro.
DIRETRIZES:
- Seja breve, mas amigável (use 'beleza', 'tranquilo', etc com moderação).
- Valide a dúvida do usuário ('Boa pergunta', 'Faz sentido').
- Vá direto ao ponto técnico, mas sem ser robótico.
${baseContext}
${tableInstruction}
ESTRUTURA: Colega prestativo e direto.`;
                break;

            case 'professional':
                systemPrompt = `CONTEXTO: Você é um VENDEDOR CONSULTIVO SÊNIOR da Tecfag Group.
PAPEL E IDENTIDADE:
- Você é um especialista comercial da Tecfag Group com profundo conhecimento em soluções técnicas, processos industriais e automação.
- Você fala como um profissional experiente, humano e estratégico. NÃO aja como um robô, vendedor insistente ou atendente genérico.

OBJETIVO PRINCIPAL:
- Conduzir o usuário de forma natural e estratégica ao entendimento de valor da solução.
- Ajudar o cliente a decidir, não pressioná-lo. Aumentar conversão através de entendimento e confiança.

METODOLOGIA DE VENDAS (SPICED - Uso Implícito):
Aplique a metodologia SPICED de forma fluida (NUNCA mencione o nome da técnica):
- Situation: Compreenda o contexto atual do cliente.
- Pain: Identifique dores reais e relevantes.
- Impact: Explore consequências práticas dessas dores.
- Critical Event: Entenda urgência ou gatilhos de decisão.
- Emotion: Reconheça emoções, receios e expectativas.
- Decision: Ajude o cliente a avançar para a decisão correta.

TOM DE VOZ E COMPORTAMENTO:
- Profissional, claro, confiante e empático.
- Sem exageros, sem frases de efeito artificiais, sem pressão por fechamento.
- Evite linguagem robótica ou promessas irreais.
- Perguntas devem ser inteligentes e pontuais, não um inquérito.

ESTRATÉGIA DE CONVERSA:
1. Comece entendendo o cenário do cliente.
2. Traduza soluções em benefícios reais.
3. Construa valor antes de falar em preço.
4. Conduza o fechamento de forma natural e consultiva.

LIMITES:
- Se não houver informação suficiente, PERGUNTE antes de sugerir.
- Seja honesto se algo não for aplicável.
- Priorize clareza e relevância.

${baseContext}
${tableInstruction}
ESTRUTURA DA RESPOSTA: Comportamento de vendedor humano experiente e consultor estratégico.`;
                break;
            default:
                systemPrompt = `CONTEXTO: Análise técnica aprofundada para engenharia/gestão.
DIRETRIZES:
- Aja como um especialista discutindo com outro especialista.
- NÃO comece com "Baseado nos documentos".
- Use terminologia técnica correta.
- Explique o raciocínio.
${baseContext}
${tableInstruction}
ESTRUTURA: Resposta técnica bem fundamentada.`;
                break;
        }

        const userPrompt = `PERGUNTA DO USUÁRIO: "${question}"

Elabore uma resposta completa baseada nos documentos acima.`;

        // 5. Generate response based on provider
        let response: string = "";

        if (AI_PROVIDER === 'groq') {
            try {
                // Construct messages for Groq (OpenAI compatible format)
                const groqMessages: any[] = [
                    { role: 'system', content: systemPrompt },
                    ...chatHistory.slice(-4).map(msg => ({ // Limit history for speed/context
                        role: msg.role === 'assistant' ? 'assistant' : 'user', // Map 'model' to 'assistant' if needed, but our interface uses 'assistant'
                        content: msg.content
                    })),
                    { role: 'user', content: userPrompt }
                ];

                console.log('[ChatService] Requesting completion from Groq (Llama 3.3 70B)...');

                const completion = await groq.chat.completions.create({
                    messages: groqMessages,
                    model: "llama-3.3-70b-versatile", // Or llama-3.1-70b-versatile
                    temperature: 0.3,
                    max_tokens: 4096,
                    top_p: 0.9,
                });

                response = completion.choices[0]?.message?.content || "";

            } catch (error: any) {
                console.error('[ChatService] Groq Error:', error);
                throw new Error(`Groq API Error: ${error.message}`);
            }

        } else {
            // GEMINI IMPLEMENTATION (Fallback or Primary if configured)
            // Include chat history for context
            const messages = [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: `Entendido. Modo ${mode} ativado.` }] },
                ...chatHistory.slice(-6).map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                })),
                { role: 'user', parts: [{ text: userPrompt }] }
            ];

            try {
                // Corrected model names
                const modelPro = genAI.getGenerativeModel({
                    model: 'gemini-1.5-pro', // Fixed name
                });

                console.log('[ChatService] Requesting completion from Gemini 1.5 Pro...');
                const resultPro = await modelPro.generateContent({
                    contents: messages as any, // Simple generation often works better than chat session for RAG one-shots
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 8192
                    }
                });

                response = resultPro.response.text();

            } catch (error: any) {
                if (error.message.includes('429') || error.message.includes('Quota')) {
                    console.warn('[ChatService] ⚠️ Pro quota exceeded. Trying Flash.');
                    const modelFlash = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    const resultFlash = await modelFlash.generateContent({
                        contents: messages as any
                    });
                    response = resultFlash.response.text();
                    response += '\n\n*(Backup: Gemini Flash)*';
                } else {
                    throw error;
                }
            }
        }

        console.log(`[ChatService] ✅ Generated response (${response.length} chars)`);

        // 6. Extract sources
        const sources = relevantChunks.map((chunk, index) => ({
            fileName: chunk.metadata?.fileName || 'Documento desconhecido',
            chunkIndex: chunk.chunkIndex,
            similarity: chunk.similarity
        }));

        return {
            response,
            sources
        };

    } catch (error: any) {
        console.error('[ChatService] Error:', error);
        throw new Error(`Failed to generate response: ${error.message}`);
    }
}

/**
 * Generate suggested questions based on available documents
 */
export async function generateSuggestedQuestions(
    catalogId?: string,
    count: number = 3
): Promise<string[]> {
    try {
        // Reduced sample size for speed
        const sampleChunks = await searchSimilarChunks(
            Array(768).fill(0.1),
            8,
            catalogId ? { catalogId } : undefined
        );

        if (sampleChunks.length === 0) {
            return [
                'Quais documentos estão disponíveis?',
                'O que este catálogo cobre?',
                'Como posso começar?'
            ];
        }

        const sampleText = sampleChunks
            .slice(0, 5)
            .map(c => `[doc] ${c.content.substring(0, 300)}`)
            .join('\n');

        const prompt = `Gere ${count} perguntas curtas e técnicas (max 10 palavras) que um engenheiro faria sobre estes textos:
${sampleText}
Apenas as perguntas, uma por linha.`;

        let questionsText = "";

        if (AI_PROVIDER === 'groq') {
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
            });
            questionsText = completion.choices[0]?.message?.content || "";
        } else {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            questionsText = result.response.text();
        }

        const questions = questionsText
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 5 && q.includes('?'))
            .slice(0, count);

        return questions.length > 0 ? questions : [
            'Quais os principais riscos?',
            'Como realizar a manutenção?',
            'Quais as especificações técnicas?'
        ];

    } catch (error) {
        console.error('[ChatService] Suggestion Error:', error);
        return [
            'Quais são os pontos principais?',
            'Existem riscos operacionais?',
            'O que diz sobre manutenção?'
        ];
    }
}
