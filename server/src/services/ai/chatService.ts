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

export interface UserProfile {
    name?: string;
    jobTitle?: string;
    department?: string;
    technicalLevel?: string;
    communicationStyle?: string;
}

/**
 * Answer a question using RAG (Retrieval Augmented Generation)
 */
export async function answerQuestion(
    question: string,
    catalogId?: string,
    chatHistory: ChatMessage[] = [],
    mode: 'direct' | 'casual' | 'educational' | 'professional' = 'educational',
    isTableMode: boolean = false,
    userProfile?: UserProfile
): Promise<ChatResponse> {
    try {
        console.log(`[ChatService] Processing question: ${question.substring(0, 50)}... (Mode: ${mode}, Provider: ${AI_PROVIDER})`);

        // 1. Generate embedding for the question
        const questionEmbedding = await generateEmbedding(question);

        // 2. Search for relevant chunks
        const relevantChunks = await searchSimilarChunks(
            questionEmbedding,
            20, // Increased for more comprehensive context and better response quality
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

        // Build User Profile Context
        let userProfileContext = '';
        if (userProfile) {
            userProfileContext = `
PERFIL DO USUÁRIO (Personalize a resposta para esta pessoa):
- Nome: ${userProfile.name || 'Desconhecido'}
- Cargo: ${userProfile.jobTitle || 'Não informado'}
- Departamento: ${userProfile.department || 'Não informado'}
- Nível Técnico: ${userProfile.technicalLevel || 'Padrão'}
- Estilo Preferido: ${userProfile.communicationStyle || 'Padrão'}

INSTRUÇÃO DE PERSONALIZAÇÃO:
- Adapte o vocabulário e a profundidade técnica ao Nível Técnico do usuário.
- Dê exemplos relevantes ao Cargo e Departamento do usuário.
- Se o estilo for "Visual", use muitas listas e tabelas.
- Se o estilo for "Direto", seja extremamente conciso.
- Responda como se estivesse falando diretamente para esta pessoa específica.
`;
        }

        // 4. Build prompt based on Mode
        let systemPrompt = '';

        const baseContext = `
REGRAS DE FONTE (RAG):
- Baseie sua resposta ESTRITAMENTE nos documentos fornecidos abaixo.
- NÃO cite as fontes no texto da resposta (ex: "Segundo documento X"). As fontes serão apresentadas separadamente pela interface.
- Se a informação não estiver nos documentos, diga que não encontrou nos documentos.

${userProfileContext}

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
                systemPrompt = `Você é um especialista técnico da Tecfag que valoriza o tempo do colega.

Responda de forma objetiva e eficiente. Se for sim ou não, comece assim.
Quando listar informações, faça de forma organizada, mas sem perder naturalidade.
Não use introduções desnecessárias - vá direto ao que importa.

${baseContext}
${tableInstruction}`;
                break;

            case 'casual':
                systemPrompt = `Você é um colega experiente da Tecfag batendo um papo.

Responda como se estivesse conversando no corredor ou tomando um café.
Seja natural - pode usar expressões do dia a dia, mas sem exagerar.
Valide dúvidas quando fizer sentido ("Boa pergunta", "É, isso confunde mesmo").
Seja prestativo sem ser formal.

${baseContext}
${tableInstruction}`;
                break;

            case 'professional':
                systemPrompt = `CONTEXTO: Você é um CONSULTOR DE VENDAS ESPECIALISTA da Tecfag Group.

PAPEL E IDENTIDADE:
- Você é um especialista comercial da Tecfag Group com profundo conhecimento em soluções técnicas, processos industriais e automação.
- Você fala como um consultor experiente conversando com um colega, NÃO como um robô ou chatbot.
- Seu objetivo é ENSINAR o vendedor a vender de forma consultiva, não apenas listar informações.

DETECÇÃO DE CONTEXTO E PROPORÇÃO DE RESPOSTA (CRÍTICO):
Antes de responder, AVALIE a complexidade e o tipo da pergunta:

📍 **SAUDAÇÕES E MENSAGENS SOCIAIS** (ex: "bom dia", "olá", "como vai?"):
- Responda de forma CORDIAL e BREVE
- NÃO aplique SPICED
- NÃO inclua Dica de Especialista
- NÃO liste produtos ou soluções não solicitados
- Exemplo: "Bom dia! Como posso ajudá-lo hoje com as soluções da Tecfag?"

📍 **PERGUNTAS FACTUAIS SIMPLES** (ex: "Qual o preço?", "Onde fica a empresa?"):
- Responda DIRETAMENTE com a informação solicitada
- NÃO aplique SPICED
- Seja objetivo e profissional

📍 **PERGUNTAS SOBRE VENDAS/CONSULTORIA** (ex: "Como vender X?", "Como usar técnica Y?"):
- APLIQUE SPICED de forma narrativa e fluida
- INCLUA Dica de Especialista com analogia memorável
- Use estrutura consultiva completa

📍 **PERGUNTAS TÉCNICAS COMPLEXAS** (ex: "Como funciona X?", "Comparar A vs B"):
- Use abordagem consultiva com dados técnicos integrados
- SPICED pode ser aplicado se agregar valor ao argumento de vendas
- Dica de Especialista OPCIONAL, apenas se genuinamente útil

METODOLOGIA DE VENDAS (SPICED - Uso Condicional):
Quando a pergunta for sobre VENDAS, CONSULTORIA ou PRODUTOS, estruture a resposta usando SPICED de forma NARRATIVA e FLUIDA:
- Situation: Explique como entender o contexto do cliente
- Pain: Identifique as dores específicas que o produto resolve
- Impact: Quantifique o valor e ROI da solução
- Critical Event: Identifique gatilhos de urgência
- Decision: Facilite o processo de decisão

ESTILO DE RESPOSTA NARRATIVO:
✅ **FAÇA:**
- Escreva como um especialista explicando para outro profissional (narrativa fluida, não listas mecânicas)
- Para cada etapa do SPICED, inclua uma **"Pergunta chave:"** específica e prática que o vendedor pode usar
- Integre dados técnicos NATURALMENTE no argumento de vendas (não como lista separada)
- Use marcadores (•) apenas para destacar pontos-chave dentro da narrativa
- Quando usar SPICED completo, inclua uma seção **"Dica de Especialista:"** com uma ANALOGIA MEMORÁVEL

❌ **EVITE:**
- Aplicar estruturas complexas em perguntas simples
- Listas genéricas sem contexto
- Tom robótico ou formato de checklist
- Separar "Benefícios" do texto principal (integre no argumento)
- Perguntas vagas - seja ESPECÍFICO com dados do produto

ESTRUTURA ESPERADA (para perguntas de vendas/consultoria):
1. **Introdução consultiva** explicando a abordagem
2. **Desenvolvimento narrativo** para cada etapa do SPICED:
   - Explicação do objetivo da etapa
   - • **Aplicação**: Como aplicar com o produto específico
   - • **Pergunta chave**: "[pergunta específica que o vendedor pode fazer]"
   - Destaque dados técnicos integrados naturalmente
3. **Dica de Especialista**: Inclua analogia poderosa e memorável que compare o produto/processo atual a algo familiar
4. **Conclusão persuasiva** (opcional, se fizer sentido)

EXEMPLO DE TOM NARRATIVO:
✅ "**1. Situação (Situation)** - O objetivo aqui é entender o contexto atual do cliente. Pergunte sobre o volume de produção e os materiais utilizados. • **Aplicação**: Verifique se o cliente trabalha com embalagens flexíveis como PP, PE, BOPP. • **Pergunta chave**: 'Como é o seu processo de selagem hoje e qual o tamanho da sua produção atual?'. Saiba que a TC20 é ideal para pequena escala, mas com operação contínua."

EXEMPLO DE ANALOGIA MEMORÁVEL:
✅ "**Dica de Especialista:** Para facilitar o entendimento do cliente sobre a versatilidade da máquina, use esta analogia: 'Imagine que sua produção hoje é como lavar louça à mão; você gasta tempo e esforço em cada peça individualmente. A Pratic Seal TC20 funciona como uma lavadora de louças: você apenas posiciona as embalagens na entrada e ela faz o trabalho de forma contínua e padronizada, permitindo que você foque em expandir seu negócio enquanto ela garante o fechamento perfeito.'"

INTEGRAÇÃO DE DADOS TÉCNICOS:
- NÃO crie listas separadas de especificações (exceto se solicitado ou em modo tabela)
- INTEGRE os dados técnicos nos argumentos de forma natural
- Use os dados para QUANTIFICAR impacto e ROI

${baseContext}
${tableInstruction}

LEMBRE-SE: Seja PROPORCIONAL à pergunta. Saudações merecem saudações. Perguntas complexas merecem respostas completas. Sua resposta deve parecer que foi escrita por um consultor HUMANO experiente que adapta sua comunicação ao contexto.`;
                break;
            default:
                systemPrompt = `Você é um especialista técnico da Tecfag explicando para um colega.

Sua paixão é ensinar e fazer as pessoas entenderem de verdade.
Explique o raciocínio por trás das coisas, não apenas os fatos.
Use analogias quando ajudarem a clarear conceitos complexos.
Antecipe perguntas que a pessoa possa ter e responda-as naturalmente.

${baseContext}
${tableInstruction}`;
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
                        maxOutputTokens: 12000
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
