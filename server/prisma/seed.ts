import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const initialMachines = [
    {
        name: "Envasadora Automática EV-3000",
        category: "Envasadoras",
        capacity: "3.000 un/hora",
        model: "EV-3000",
        price: "R$ 85.000,00",
        maintenanceStatus: "ok",
        lastMaintenance: "15/12/2025",
        specifications: [
            "Pistões pneumáticos de alta precisão",
            "Bicos de envase em aço inox 316",
            "Sistema CIP integrado",
            "Painel touch screen 10\"",
        ],
    },
    {
        name: "Seladora de Indução SI-500",
        category: "Seladoras",
        capacity: "500 un/hora",
        model: "SI-500",
        price: "R$ 32.000,00",
        maintenanceStatus: "attention",
        lastMaintenance: "01/11/2025",
        specifications: [
            "Potência ajustável 500W-2000W",
            "Compatível com tampas de 20-80mm",
            "Sensor de presença de tampa",
            "Sistema de resfriamento forçado",
        ],
    },
    {
        name: "Esteira Transportadora ET-2000",
        category: "Transporte",
        capacity: "2.000 kg/hora",
        model: "ET-2000",
        price: "R$ 18.500,00",
        maintenanceStatus: "ok",
        lastMaintenance: "20/12/2025",
        specifications: [
            "Correia em PVC alimentício",
            "Largura útil: 400mm",
            "Velocidade variável: 5-30 m/min",
            "Estrutura em alumínio anodizado",
        ],
    },
    {
        name: "Rotuladora Automática RA-800",
        category: "Rotulagem",
        capacity: "800 un/hora",
        model: "RA-800",
        price: "R$ 45.000,00",
        maintenanceStatus: "critical",
        lastMaintenance: "15/09/2025",
        specifications: [
            "Aplicação de rótulos autoadesivos",
            "Sensor de posição a laser",
            "Bobinas até 300mm de diâmetro",
            "Interface via CLP Siemens",
        ],
    },
];

const initialMindMapNodes = [
    { id: "1", label: "Linha de Produção", type: "process", x: 50, y: 50, connections: ["2", "3", "4"] },
    { id: "2", label: "Envasadora", type: "machine", x: 20, y: 30, connections: ["5"] },
    { id: "3", label: "Seladora", type: "machine", x: 50, y: 30, connections: ["6"] },
    { id: "4", label: "Esteira", type: "machine", x: 80, y: 30, connections: [] },
    { id: "5", label: "Pressão: 2.5 bar", type: "parameter", x: 15, y: 10, connections: [] },
    { id: "6", label: "Temp: 180°C", type: "parameter", x: 55, y: 10, connections: [] },
];

async function main() {
    console.log('🌱 Starting database seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@tecia.com' },
        update: {},
        create: {
            email: 'admin@tecia.com',
            password: adminPassword,
            name: 'Administrador',
            role: 'ADMIN',
        },
    });
    console.log('✅ Admin user created:', admin.email);

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'user@tecia.com' },
        update: {},
        create: {
            email: 'user@tecia.com',
            password: userPassword,
            name: 'Usuário',
            role: 'USER',
        },
    });
    console.log('✅ Regular user created:', user.email);

    // Create machines
    for (const machineData of initialMachines) {
        const { specifications, ...data } = machineData;

        const existingMachine = await prisma.machine.findFirst({
            where: { model: data.model },
        });

        if (!existingMachine) {
            await prisma.machine.create({
                data: {
                    ...data,
                    specifications: {
                        create: specifications.map((content) => ({ content })),
                    },
                },
            });
            console.log(`✅ Machine created: ${data.name}`);
        }
    }

    // Create default mind map
    const existingMindMap = await prisma.mindMap.findFirst({
        where: { name: 'Linha de Produção Principal' },
    });

    if (!existingMindMap) {
        const mindMap = await prisma.mindMap.create({
            data: { name: 'Linha de Produção Principal' },
        });

        // Create nodes with ID mapping
        const idMapping: Record<string, string> = {};

        for (const node of initialMindMapNodes) {
            const createdNode = await prisma.mindMapNode.create({
                data: {
                    mindMapId: mindMap.id,
                    label: node.label,
                    type: node.type,
                    x: node.x,
                    y: node.y,
                },
            });
            idMapping[node.id] = createdNode.id;
        }

        // Create connections
        for (const node of initialMindMapNodes) {
            const fromNodeId = idMapping[node.id];
            for (const targetId of node.connections) {
                const toNodeId = idMapping[targetId];
                if (fromNodeId && toNodeId) {
                    await prisma.mindMapConnection.create({
                        data: { fromNodeId, toNodeId },
                    });
                }
            }
        }

        console.log('✅ Mind map created: Linha de Produção Principal');
    }

    console.log('🎉 Database seed completed!');
    console.log('\n📋 Test credentials:');
    console.log('   Admin: admin@tecia.com / admin123');
    console.log('   User:  user@tecia.com / user123');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
