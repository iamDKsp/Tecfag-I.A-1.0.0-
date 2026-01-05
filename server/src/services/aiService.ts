import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/database.js';

const SYSTEM_PROMPT = `Você é a IA da Tec I.A, especializada em máquinas industriais como envasadoras, seladoras, esteiras transportadoras e rotuladoras.

Seu conhecimento inclui:
- Especificações técnicas de máquinas industriais
- Parâmetros de operação e manutenção
- Recomendações de uso e boas práticas
- Solução de problemas comuns
- Integração entre diferentes equipamentos

Responda de forma profissional, técnica mas acessível. 
IMPORTANTE: Você está conversando com vendedores e funcionários da empresa Tecfag. NÃO trate o usuário como um cliente externo.
O objetivo é dar suporte interno para que eles possam vender melhor ou operar melhor as máquinas.
Seje direto e eficiente, mas mantenha a cordialidade de um colega de trabalho ou assistente especialista para a equipe interna.
Se não souber algo específico, indique que o usuário deve consultar o catálogo ou o suporte técnico.`;

// Fallback responses when AI is not available
const FALLBACK_RESPONSES = [
    "Baseado na sua pergunta sobre equipamentos industriais, posso informar que as envasadoras automáticas têm capacidade de 2.000 a 12.000 unidades/hora, dependendo do modelo. Consulte o catálogo para especificações detalhadas.",
    "As seladoras de indução são ideais para produtos que requerem vedação hermética. Recomendo verificar o catálogo para especificações detalhadas de cada modelo.",
    "Para esse tipo de aplicação industrial, sugiro consultar o mapa mental para entender melhor as conexões entre os diferentes equipamentos e processos.",
    "Os parâmetros de manutenção preventiva variam conforme o modelo. Acesse o catálogo para ver o cronograma recomendado de cada máquina.",
    "Para otimizar a linha de produção, é importante considerar a capacidade de cada equipamento e o fluxo de materiais. Posso ajudar com mais detalhes específicos.",
];

export class AIService {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey.length > 10) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    async generateResponse(userMessage: string, userId: string): Promise<string> {
        // Get recent chat history for context
        const recentMessages = await prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        // Get user preferences
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                jobTitle: true,
                department: true,
                technicalLevel: true,
                communicationStyle: true,
                name: true
            }
        });

        let systemPromptWithContext = SYSTEM_PROMPT;
        if (user) {
            const contextParts = [];
            if (user.name) contextParts.push(`Nome do Usuário: ${user.name}`);
            if (user.jobTitle) contextParts.push(`Cargo: ${user.jobTitle}`);
            if (user.department) contextParts.push(`Departamento: ${user.department}`);
            if (user.technicalLevel) contextParts.push(`Nível Técnico: ${user.technicalLevel}`);
            if (user.communicationStyle) contextParts.push(`Estilo Preferido de Resposta: ${user.communicationStyle}`);

            if (contextParts.length > 0) {
                systemPromptWithContext += `\n\nCONTEXTO DO USUÁRIO:\n${contextParts.join('\n')}\nUtilize estas informações para personalizar suas respostas.`;
            }
        }

        // Build conversation history
        const history = recentMessages.reverse().map((msg) => ({
            role: msg.role as 'user' | 'model',
            parts: [{ text: msg.content }],
        }));

        // Try AI if available
        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

                const chat = model.startChat({
                    history: history.map((h) => ({
                        role: h.role === 'user' ? 'user' : 'model',
                        parts: h.parts,
                    })),
                    generationConfig: {
                        maxOutputTokens: 1000,
                        temperature: 0.7,
                    },
                });

                const result = await chat.sendMessage(`${systemPromptWithContext}\n\nUsuário: ${userMessage}`);
                return result.response.text();
            } catch (error) {
                console.error('❌ Error generating AI response:', error);
                if (error instanceof Error) {
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                }
                // Fallback
                return this.getFallbackResponse(userMessage);
            }
        }

        // Fallback response
        return this.getFallbackResponse(userMessage);
    }

    private getFallbackResponse(userMessage: string): string {
        const lowerMessage = userMessage.toLowerCase();

        // Context-aware fallback responses
        if (lowerMessage.includes('envasadora') || lowerMessage.includes('envase')) {
            return "As envasadoras automáticas da Tec I.A possuem capacidade de 2.000 a 12.000 unidades/hora. Os modelos EV-3000 e superiores contam com pistões pneumáticos de alta precisão e bicos em aço inox 316. Consulte o catálogo para mais detalhes.";
        }

        if (lowerMessage.includes('seladora') || lowerMessage.includes('vedação')) {
            return "As seladoras de indução trabalham com potência ajustável de 500W a 2000W, compatíveis com tampas de 20-80mm. O modelo SI-500 possui sensor de presença e sistema de resfriamento forçado.";
        }

        if (lowerMessage.includes('esteira') || lowerMessage.includes('transporte')) {
            return "As esteiras transportadoras ET-2000 suportam até 2.000 kg/hora, com correia em PVC alimentício, largura útil de 400mm e velocidade variável de 5-30 m/min.";
        }

        if (lowerMessage.includes('rotuladora') || lowerMessage.includes('rótulo')) {
            return "A rotuladora automática RA-800 aplica até 800 rótulos autoadesivos por hora, com sensor de posição a laser e interface CLP Siemens.";
        }

        if (lowerMessage.includes('manutenção')) {
            return "A manutenção preventiva é essencial para garantir a longevidade dos equipamentos. Cada máquina possui um cronograma específico no catálogo. Verifique o status de manutenção regularmente.";
        }

        // Random fallback
        return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    }
}

export const aiService = new AIService();
