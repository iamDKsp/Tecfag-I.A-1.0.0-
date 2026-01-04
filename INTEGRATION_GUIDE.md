# 🚀 Guia Rápido de Integração

## Para usar o sistema RAG no seu projeto, siga estes passos:

### 1. Criar Itens de Catálogo (Se ainda não existem)

O sistema precisa de itens de catálogo para associar documentos. Crie alguns itens:

```bash
# Via SQL direto no SQLite, ou crie uma rota/seed
INSERT INTO CatalogItem (id, code, name, category, description) VALUES
('cat-001', 'MQ-XYZ-100', 'Máquina XYZ Industrial', 'Máquinas', 'Equipamento de produção'),
('cat-002', 'PR-ABC-200', 'Processo ABC', 'Processos', 'Processo de fabricação');
```

### 2. Integrar Upload ao Catálogo

Edite `src/components/catalog/CatalogTab.tsx`:

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from '@/components/ai/DocumentUpload';
import { DocumentList } from '@/components/ai/DocumentList';
import { FileText } from 'lucide-react';

// Em cada card de item do catálogo, adicione:
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline" size="sm">
      <FileText className="w-4 h-4 mr-2" />
      Documentos IA
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>{item.name} - Documentos</DialogTitle>
    </DialogHeader>
    <div className="space-y-6">
      <DocumentUpload 
        catalogId={item.id}
        onUploadComplete={() => {
          // Recarregar lista de documentos
          fetchDocuments();
        }}
      />
      <DocumentList
        documents={documents}
        onDelete={handleDeleteDocument}
        onReindex={handleReindexDocument}
      />
    </div>
  </DialogContent>
</Dialog>

// Funções helper:
const [documents, setDocuments] = useState([]);

const fetchDocuments = async () => {
  const response = await fetch(`/api/documents/catalog/${item.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  setDocuments(data);
};

const handleDeleteDocument = async (docId: string) => {
  await fetch(`/api/documents/${docId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  fetchDocuments();
};

const handleReindexDocument = async (docId: string) => {
  await fetch(`/api/documents/${docId}/reindex`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  // Atualizar status após alguns segundos
  setTimeout(fetchDocuments, 3000);
};
```

### 3. Atualizar Chat para Usar RAG

Edite `src/components/chat/ChatTab.tsx`:

```typescript
import { QuestionSuggestions } from '@/components/ai/QuestionSuggestions';

// Adicionar estados:
const [suggestions, setSuggestions] = useState<string[]>([]);
const [loadingSuggestions, setLoadingSuggestions] = useState(false);

// Carregar sugestões ao montar:
useEffect(() => {
  loadSuggestions();
}, []);

const loadSuggestions = async () => {
  setLoadingSuggestions(true);
  try {
    const response = await fetch('/api/chat/suggestions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setSuggestions(data.suggestions);
  } catch (error) {
    console.error('Error loading suggestions:', error);
  }
  setLoadingSuggestions(false);
};

// Trocar fetch de /api/chat para /api/chat/rag:
const sendMessage = async () => {
  const response = await fetch('/api/chat/rag', { // ← mudança aqui
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: message })
  });
  
  const data = await response.json();
  
  // Adicionar mensagens ao chat
  setMessages([
    ...messages,
    data.userMessage,
    data.assistantMessage
  ]);
  
  // Opcional: mostrar fontes
  if (data.sources && data.sources.length > 0) {
    console.log('Fontes usadas:', data.sources);
  }
  
  // Recarregar sugestões após cada resposta
  loadSuggestions();
};

// No JSX, adicionar sugestões acima do input:
<div className="chat-container">
  {/* Mensagens */}
  {messages.map(msg => <Message key={msg.id} {...msg} />)}
  
  {/* Sugestões */}
  {suggestions.length > 0 && (
    <div className="px-4 py-2">
      <QuestionSuggestions
        suggestions={suggestions}
        onSelectSuggestion={(q) => {
          setMessage(q);
          // Opcional: enviar automaticamente
          sendMessage();
        }}
        loading={loadingSuggestions}
      />
    </div>
  )}
  
  {/* Input */}
  <div className="chat-input">
    {/* ... seu input existente ... */}
  </div>
</div>
```

### 4. Adicionar Dependência Frontend (react-dropzone)

```bash
npm install react-dropzone
```

---

## ✅ Testando o Sistema

### Teste 1: Upload de Documento

1. Acesse o catálogo
2. Clique em "Documentos IA" em um item
3. Arraste um PDF técnico
4. Aguarde processamento (~30-60s)
5. Veja status mudar para "✓ Indexado"

### Teste 2: Chat com Documento

1. Vá para o chat
2. Veja as sugestões de perguntas
3. Faça uma pergunta sobre o documento
4. Veja a resposta com citação de fonte

### Teste 3: Qualidade da Resposta

Teste se a IA:
- ✅ Responde APENAS com informações do documento
- ✅ Cita fontes corretamente
- ✅ Diz "não encontrei" quando não sabe
- ✅ É precisa e técnica

---

## 🐛 Troubleshooting

### Problema: "EPERM: operation not permitted"
**Solução:** Feche o VSCode ou qualquer processo que esteja usando os arquivos do Prisma e rode `npm run db:push` novamente.

### Problema: Upload não funciona
**Solução:** Verifique se a pasta `uploads` existe e tem permissões de escrita.

### Problema: IA não encontra documentos
**Solução:** 
1. Verifique se o documento foi indexado (`indexed: true`)
2. Veja os logs do backend para erros de processamento
3. Certifique-se que a GEMINI_API_KEY está correta

### Problema: Erro de CORS
**Solução:** Verifique se `FRONTEND_URL` no `.env` está correto.

---

## 📊 Monitoramento

Para ver o que está acontecendo, adicione logs:

```typescript
// Backend - ver processamento
console.log('[DocumentProcessor] Processing:', documentId);

// Frontend - ver uploads
console.log('Upload progress:', progress);
```

---

**Sistema pronto para uso!** 🎉

Qualquer dúvida, consulte o [walkthrough.md](file:///C:/Users/DKS/.gemini/antigravity/brain/eacfa4cc-a554-4968-9f93-7467558e6bfe/walkthrough.md) completo.
