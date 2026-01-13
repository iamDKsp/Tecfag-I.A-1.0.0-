import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalogItems = [
    {
        id: "1",
        code: "PAMQIPAU007",
        name: "PAGINADORA ROTATIVA EM ACO INOX",
        category: "Esteiras Transportadoras",
        description: "Equipamento automático para paginação de rótulos, papéis e embalagens"
    },
    {
        id: "2",
        code: "PAMQGPAU055",
        name: "ALIMENTADOR ELEVADOR DE CANECAS P/ EMPACOTADORAS",
        category: "Esteiras Transportadoras",
        description: "Sistema de elevação para grãos com capacidade de 18000 litros/h"
    },
    {
        id: "3",
        code: "PAMQESAU004",
        name: "BC1.5M/200S ESTEIRA FIXA LONA ACO INOX",
        category: "Esteiras Transportadoras",
        description: "Esteira transportadora em aço inox para frascos, latas e outros"
    },
    {
        id: "4",
        code: "PAMQESMN012",
        name: "BC1M/W300P ESTEIRA TRANSP. EM LONA",
        category: "Esteiras Transportadoras",
        description: "Esteira transportadora em lona para frascos, latas e outros produtos"
    },
    {
        id: "5",
        code: "PAMQESMN016",
        name: "BC2.5M/300S ESTEIRA TRANSP. INOX",
        category: "Esteiras Transportadoras",
        description: "Esteira transportadora em inox de 2.5m"
    },
    {
        id: "6",
        code: "PAMQESMN020",
        name: "BC2.5M/W300P ESTEIRA TRANSP. EM LONA",
        category: "Esteiras Transportadoras",
        description: "Esteira transportadora em lona de 2.5m"
    },
    {
        id: "7",
        code: "PAMQESMN022",
        name: "BC2.5M/W500P ESTEIRA TRANSP. EM LONA",
        category: "Esteiras Transportadoras",
        description: "Esteira transportadora em lona de 2.5m, largura 500mm"
    },
    {
        id: "8",
        code: "PAMQESMN013",
        name: "BC2.5M/W500S ESTEIRA TRANSP. INOX",
        category: "Esteiras Transportadoras",
        description: "Esteira transportadora em inox de 2.5m, largura 500mm"
    },
    {
        id: "9",
        code: "PAMQESAU005",
        name: "BTT1000 - MESA ACUMULADORA GIRATORIA",
        category: "Esteiras Transportadoras",
        description: "Mesa acumuladora giratória para frascos com diâmetro de 1000mm"
    },
    {
        id: "10",
        code: "PAMQESMA006",
        name: "ESTEIRA TRANSPORTADORA 1M C/ CONTROLE",
        category: "Esteiras Transportadoras",
        description: "Esteira transportadora de 1 metro com sistema de controle integrado"
    }
];

async function main() {
    console.log('🌱 Iniciando seed do catálogo...');

    for (const item of catalogItems) {
        const existing = await prisma.catalogItem.findUnique({
            where: { id: item.id }
        });

        if (existing) {
            console.log(`✓ Item já existe: ${item.name}`);
            continue;
        }

        await prisma.catalogItem.create({
            data: item
        });

        console.log(`✓ Criado: ${item.name}`);
    }

    console.log('✅ Seed concluído!');
    console.log(`📊 Total de itens: ${catalogItems.length}`);
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
