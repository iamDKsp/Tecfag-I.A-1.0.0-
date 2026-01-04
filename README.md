# Tecfag Group - Industrial Intelligence Hub

Sistema de Inteligência Artificial para Máquinas Industriais

## Sobre o Projeto

O **Industrial Intelligence Hub** é uma plataforma desenvolvida pela Tecfag Group para fornecer suporte inteligente e gestão de máquinas industriais. O sistema integra chat com IA, catálogo de máquinas e dashboards administrativos.

## Desenvolvimento Local

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>

# Navegue até o diretório do projeto
cd industrial-intelligence-hub

# Instale as dependências
npm install

# Configure as variáveis de ambiente
# Copie o arquivo .env.example e configure conforme necessário
```

### Executando o Projeto

```bash
# Iniciar apenas o frontend
npm run dev

# Iniciar apenas o backend
npm run server

# Iniciar frontend e backend simultaneamente
npm start
```

O frontend estará disponível em `http://localhost:8080`
O backend estará disponível em `http://localhost:3001`

## Tecnologias Utilizadas

- **Frontend:**
  - Vite + React + TypeScript
  - Tailwind CSS
  - shadcn/ui (componentes)
  - Lucide React (ícones)
  - React Router (navegação)

- **Backend:**
  - Node.js + Express
  - Prisma ORM
  - PostgreSQL
  - JWT (autenticação)

## Estrutura do Projeto

```
industrial-intelligence-hub/
├── src/                    # Código fonte do frontend
│   ├── components/         # Componentes React
│   ├── pages/             # Páginas da aplicação
│   ├── contexts/          # Contextos React (Auth, etc)
│   └── lib/               # Utilitários
├── server/                # Código fonte do backend
│   ├── src/
│   │   ├── routes/        # Rotas da API
│   │   ├── middleware/    # Middlewares
│   │   └── services/      # Serviços
│   └── prisma/            # Schema e migrações do banco
└── public/                # Arquivos estáticos

```

## Deploy

Para fazer o deploy da aplicação:

1. **Frontend:** Configure as variáveis de ambiente em sua plataforma (Vercel, Netlify, etc.)
2. **Backend:** Deploy em plataforma Node.js (Railway, Heroku, etc.)
3. Configure as variáveis de ambiente necessárias (DATABASE_URL, JWT_SECRET, etc.)

## Licença

© 2026 Tecfag Group - Todos os direitos reservados
