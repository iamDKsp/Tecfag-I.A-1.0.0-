import { useState, useEffect, MouseEvent, WheelEvent, useMemo, useRef } from "react";
import { Plus, Trash2, Edit2, Save, X, Undo, Link as LinkIcon, Check, Settings, Zap, Cog, Box, Database, Cpu, Activity, AlertTriangle, User, Server, Wifi, Truck, ShoppingCart, ChevronDown, ChevronRight, ChevronLeft, GitFork, Pencil, Eye, EyeOff, Search, Maximize2, Minimize2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// --- Icon System ---
const ICON_MAP: Record<string, any> = {
  cog: Cog,
  zap: Zap,
  settings: Settings,
  box: Box,
  database: Database,
  cpu: Cpu,
  activity: Activity,
  alert: AlertTriangle,
  user: User,
  server: Server,
  wifi: Wifi,
  truck: Truck,
  cart: ShoppingCart
};

interface NodeType {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface MindMapNode {
  id: string;
  label: string;
  typeId: string;
  x: number;
  y: number;
  connections: string[];
  collapsed?: boolean;
}

interface MindMapTabProps {
  isAdmin: boolean;
}

const defaultNodeTypes: NodeType[] = [
  { id: "machine", label: "Máquina", color: "hsl(var(--primary))", icon: "cog" },
  { id: "process", label: "Processo", color: "hsl(var(--accent))", icon: "zap" },
  { id: "parameter", label: "Parâmetro", color: "hsl(var(--secondary))", icon: "settings" },
];

const initialNodes: MindMapNode[] = [
  { id: "1", label: "Linha de Produção", typeId: "process", x: 400, y: 300, connections: ["2", "3", "4"] },
  { id: "2", label: "Envasadora", typeId: "machine", x: 200, y: 200, connections: ["5"] },
  { id: "3", label: "Seladora", typeId: "machine", x: 400, y: 200, connections: ["6"] },
  { id: "4", label: "Esteira", typeId: "machine", x: 600, y: 200, connections: [] },
  { id: "5", label: "Pressão: 2.5 bar", typeId: "parameter", x: 150, y: 100, connections: [] },
  { id: "6", label: "Temp: 180°C", typeId: "parameter", x: 450, y: 100, connections: [] },
];

const STORAGE_KEY = "mindmap-storage-v3";
const FLOWS_STORAGE_KEY = "mindmap-flows-v1";
const LAST_FLOW_KEY = "mindmap-last-flow-id";

interface Flow {
  id: string;
  name: string;
  nodes: MindMapNode[];
  nodeTypes: NodeType[];
  timestamp: number;
}

const MindMapTab = ({ isAdmin }: MindMapTabProps) => {
  const { toast } = useToast();
  // --- State ---
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>(defaultNodeTypes);
  const [nodes, setNodes] = useState<MindMapNode[]>(initialNodes);
  const [history, setHistory] = useState<{ nodes: MindMapNode[], types: NodeType[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isViewMode, setIsViewMode] = useState(false);

  // Viewport
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Interactions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Category State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<NodeType | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [categoryColorInput, setCategoryColorInput] = useState("#3b82f6");
  const [categoryIconInput, setCategoryIconInput] = useState("box");

  // --- Flows State ---
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isFlowNameDialogOpen, setIsFlowNameDialogOpen] = useState(false);
  const [flowNameInput, setFlowNameInput] = useState("");

  // --- Initialization & Persistence ---

  useEffect(() => {
    // 1. Load Flows
    const loadedFlowsStr = localStorage.getItem(FLOWS_STORAGE_KEY);
    let loadedFlows: Flow[] = [];
    if (loadedFlowsStr) {
      try {
        loadedFlows = JSON.parse(loadedFlowsStr);
      } catch (e) {
        console.error("Failed to load flows", e);
      }
    }

    // 1.5. Ensure Example Flows exist
    const exampleFlow1: Flow = {
      id: "example-flow-1",
      name: "Linha de Envase - Bebidas",
      timestamp: Date.now() - 1000,
      nodeTypes: defaultNodeTypes,
      nodes: [
        { id: "e1-1", label: "Linha de Envase", typeId: "process", x: 400, y: 300, connections: ["e1-2", "e1-3"] },
        { id: "e1-2", label: "Envasadora Principal", typeId: "machine", x: 250, y: 180, connections: ["e1-4", "e1-5", "e1-6"] },
        { id: "e1-3", label: "Envasadora Secundária", typeId: "machine", x: 550, y: 180, connections: ["e1-7", "e1-8", "e1-9"] },
        { id: "e1-4", label: "Capacidade: 12.000 unid/h", typeId: "parameter", x: 100, y: 80, connections: [] },
        { id: "e1-5", label: "Volume: 250-500ml", typeId: "parameter", x: 250, y: 60, connections: [] },
        { id: "e1-6", label: "Material: PET/Vidro", typeId: "parameter", x: 400, y: 80, connections: [] },
        { id: "e1-7", label: "Capacidade: 8.000 unid/h", typeId: "parameter", x: 480, y: 60, connections: [] },
        { id: "e1-8", label: "Volume: 1L-2L", typeId: "parameter", x: 630, y: 60, connections: [] },
        { id: "e1-9", label: "Material: PET", typeId: "parameter", x: 700, y: 80, connections: [] },
      ]
    };

    const exampleFlow2: Flow = {
      id: "example-flow-2",
      name: "Linha de Selagem - Alimentos",
      timestamp: Date.now(),
      nodeTypes: defaultNodeTypes,
      nodes: [
        { id: "e2-1", label: "Linha de Selagem", typeId: "process", x: 400, y: 300, connections: ["e2-2", "e2-3"] },
        { id: "e2-2", label: "Seladora Horizontal", typeId: "machine", x: 250, y: 180, connections: ["e2-4", "e2-5", "e2-6"] },
        { id: "e2-3", label: "Seladora Vertical", typeId: "machine", x: 550, y: 180, connections: ["e2-7", "e2-8", "e2-9"] },
        { id: "e2-4", label: "Velocidade: 60 ciclos/min", typeId: "parameter", x: 100, y: 80, connections: [] },
        { id: "e2-5", label: "Temp: 120-180°C", typeId: "parameter", x: 250, y: 60, connections: [] },
        { id: "e2-6", label: "Material: Polipropileno", typeId: "parameter", x: 400, y: 80, connections: [] },
        { id: "e2-7", label: "Velocidade: 45 ciclos/min", typeId: "parameter", x: 480, y: 60, connections: [] },
        { id: "e2-8", label: "Temp: 140-200°C", typeId: "parameter", x: 630, y: 60, connections: [] },
        { id: "e2-9", label: "Material: Polietileno", typeId: "parameter", x: 700, y: 80, connections: [] },
      ]
    };

    const exampleFlow3: Flow = {
      id: "example-flow-3-v2", // Version bumped to force update
      name: "Máquinas Industriais - Completo",
      timestamp: Date.now(),
      nodeTypes: defaultNodeTypes,
      nodes: [
        // --- 0. ROOT CATEGORY ---
        { id: "root", label: "Esteiras Transportadoras", typeId: "process", x: 1000, y: 0, connections: ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10"] },

        // --- 1. PAGINADORA ROTATIVA ---
        { id: "m1", label: "PAGINADORA ROTATIVA", typeId: "machine", x: 0, y: 300, connections: ["m1-c", "m1-t", "m1-v", "m1-l", "m1-w", "m1-tm"] },
        { id: "m1-c", label: "Cód: PAMQIPAU007", typeId: "parameter", x: -150, y: 400, connections: [] },
        { id: "m1-t", label: "Prod: Rótulos/Papéis", typeId: "parameter", x: -50, y: 450, connections: [] },
        { id: "m1-v", label: "Vel: 0-50 m/min", typeId: "parameter", x: 50, y: 400, connections: [] },
        { id: "m1-l", label: "Comp: 1500 mm", typeId: "parameter", x: 150, y: 450, connections: [] },
        { id: "m1-w", label: "Larg: 50-300 mm", typeId: "parameter", x: 250, y: 400, connections: [] },
        { id: "m1-tm", label: "Auto", typeId: "parameter", x: 350, y: 450, connections: [] },

        // --- 2. ALIMENTADOR ELEVADOR ---
        { id: "m2", label: "ALIMENTADOR ELEVADOR", typeId: "machine", x: 500, y: 300, connections: ["m2-c", "m2-t", "m2-v", "m2-h", "m2-l", "m2-tm"] },
        { id: "m2-c", label: "Cód: PAMQGPAU055", typeId: "parameter", x: 350, y: 400, connections: [] },
        { id: "m2-t", label: "Prod: Grãos", typeId: "parameter", x: 450, y: 450, connections: [] },
        { id: "m2-v", label: "Vol: 18000 L/h", typeId: "parameter", x: 550, y: 400, connections: [] },
        { id: "m2-h", label: "Alt: 1900 mm", typeId: "parameter", x: 650, y: 450, connections: [] },
        { id: "m2-l", label: "Comp: 2100 mm", typeId: "parameter", x: 750, y: 400, connections: [] },
        { id: "m2-tm", label: "Auto", typeId: "parameter", x: 850, y: 450, connections: [] },

        // --- 3. ESTEIRA BC1.5M/200S ---
        { id: "m3", label: "ESTEIRA BC1.5M/200S", typeId: "machine", x: 1000, y: 300, connections: ["m3-c", "m3-t", "m3-v", "m3-l", "m3-w", "m3-tm"] },
        { id: "m3-c", label: "Cód: PAMQESAU004", typeId: "parameter", x: 850, y: 400, connections: [] },
        { id: "m3-t", label: "Prod: Frascos/Latas", typeId: "parameter", x: 950, y: 450, connections: [] },
        { id: "m3-v", label: "Vel: 9-30 m/min", typeId: "parameter", x: 1050, y: 400, connections: [] },
        { id: "m3-l", label: "Comp: 1500 mm", typeId: "parameter", x: 1150, y: 450, connections: [] },
        { id: "m3-w", label: "Lona: 190 mm", typeId: "parameter", x: 1250, y: 400, connections: [] },
        { id: "m3-tm", label: "Auto", typeId: "parameter", x: 1350, y: 450, connections: [] },

        // --- 4. ESTEIRA BC1M/W300P ---
        { id: "m4", label: "ESTEIRA BC1M/W300P", typeId: "machine", x: 1500, y: 300, connections: ["m4-c", "m4-t", "m4-v", "m4-l", "m4-w", "m4-tm"] },
        { id: "m4-c", label: "Cód: PAMQESMN012", typeId: "parameter", x: 1350, y: 400, connections: [] },
        { id: "m4-t", label: "Prod: Frascos/Latas", typeId: "parameter", x: 1450, y: 450, connections: [] },
        { id: "m4-v", label: "Vel: 30 m/min", typeId: "parameter", x: 1550, y: 400, connections: [] },
        { id: "m4-l", label: "Comp: 1000 mm", typeId: "parameter", x: 1650, y: 450, connections: [] },
        { id: "m4-w", label: "Lona: 190 mm", typeId: "parameter", x: 1750, y: 400, connections: [] },
        { id: "m4-tm", label: "Auto", typeId: "parameter", x: 1850, y: 450, connections: [] },

        // --- 5. ESTEIRA BC2.5M/300S ---
        { id: "m5", label: "ESTEIRA BC2.5M/300S", typeId: "machine", x: 2000, y: 300, connections: ["m5-c", "m5-t", "m5-v", "m5-l", "m5-w", "m5-tm"] },
        { id: "m5-c", label: "Cód: PAMQESMN016", typeId: "parameter", x: 1850, y: 400, connections: [] },
        { id: "m5-t", label: "Prod: Frascos/Latas", typeId: "parameter", x: 1950, y: 450, connections: [] },
        { id: "m5-v", label: "Vel: 30 m/min", typeId: "parameter", x: 2050, y: 400, connections: [] },
        { id: "m5-l", label: "Comp: 1000 mm", typeId: "parameter", x: 2150, y: 450, connections: [] },
        { id: "m5-w", label: "Lona: 190 mm", typeId: "parameter", x: 2250, y: 400, connections: [] },
        { id: "m5-tm", label: "Auto", typeId: "parameter", x: 2350, y: 450, connections: [] },

        // --- ROW 2 ---

        // --- 6. ESTEIRA BC2.5M/W300P ---
        { id: "m6", label: "ESTEIRA BC2.5M/W300P", typeId: "machine", x: 0, y: 700, connections: ["m6-c", "m6-t", "m6-v", "m6-l", "m6-w", "m6-tm"] },
        { id: "m6-c", label: "Cód: PAMQESMN020", typeId: "parameter", x: -150, y: 800, connections: [] },
        { id: "m6-t", label: "Prod: Frascos/Latas", typeId: "parameter", x: -50, y: 850, connections: [] },
        { id: "m6-v", label: "Vel: 30 m/min", typeId: "parameter", x: 50, y: 800, connections: [] },
        { id: "m6-l", label: "Comp: 2500 mm", typeId: "parameter", x: 150, y: 850, connections: [] },
        { id: "m6-w", label: "Lona: 190 mm", typeId: "parameter", x: 250, y: 800, connections: [] },
        { id: "m6-tm", label: "Auto", typeId: "parameter", x: 350, y: 850, connections: [] },

        // --- 7. ESTEIRA BC2.5M/W500P ---
        { id: "m7", label: "ESTEIRA BC2.5M/W500P", typeId: "machine", x: 500, y: 700, connections: ["m7-c", "m7-t", "m7-v", "m7-l", "m7-tm"] },
        { id: "m7-c", label: "Cód: PAMQESMN022", typeId: "parameter", x: 350, y: 800, connections: [] },
        { id: "m7-t", label: "Prod: Frascos/Latas", typeId: "parameter", x: 450, y: 850, connections: [] },
        { id: "m7-v", label: "Vel: 30 m/min", typeId: "parameter", x: 550, y: 800, connections: [] },
        { id: "m7-l", label: "Comp: 2500 mm", typeId: "parameter", x: 650, y: 850, connections: [] },
        { id: "m7-tm", label: "Auto", typeId: "parameter", x: 750, y: 800, connections: [] },

        // --- 8. ESTEIRA BC2.5M/W500S ---
        { id: "m8", label: "ESTEIRA BC2.5M/W500S", typeId: "machine", x: 1000, y: 700, connections: ["m8-c", "m8-t", "m8-v", "m8-l", "m8-tm"] },
        { id: "m8-c", label: "Cód: PAMQESMN013", typeId: "parameter", x: 850, y: 800, connections: [] },
        { id: "m8-t", label: "Prod: Frascos/Latas", typeId: "parameter", x: 950, y: 850, connections: [] },
        { id: "m8-v", label: "Vel: 30 m/min", typeId: "parameter", x: 1050, y: 800, connections: [] },
        { id: "m8-l", label: "Comp: 2500 mm", typeId: "parameter", x: 1150, y: 850, connections: [] },
        { id: "m8-tm", label: "Auto", typeId: "parameter", x: 1250, y: 800, connections: [] },

        // --- 9. MESA ACUMULADORA BTT1000 ---
        { id: "m9", label: "MESA BTT1000", typeId: "machine", x: 1500, y: 700, connections: ["m9-c", "m9-t", "m9-v", "m9-dp", "m9-dm", "m9-tm"] },
        { id: "m9-c", label: "Cód: PAMQESAU005", typeId: "parameter", x: 1350, y: 800, connections: [] },
        { id: "m9-t", label: "Prod: Frascos", typeId: "parameter", x: 1450, y: 850, connections: [] },
        { id: "m9-v", label: "0-10 rot/min", typeId: "parameter", x: 1550, y: 800, connections: [] },
        { id: "m9-dp", label: "Prod: Ø20-100 mm", typeId: "parameter", x: 1650, y: 850, connections: [] },
        { id: "m9-dm", label: "Mesa: 1000 mm", typeId: "parameter", x: 1750, y: 800, connections: [] },
        { id: "m9-tm", label: "Auto", typeId: "parameter", x: 1850, y: 850, connections: [] },

        // --- 10. ESTEIRA 1M C/ CTR ---
        { id: "m10", label: "ESTEIRA 1M C/ CTR", typeId: "machine", x: 2000, y: 700, connections: ["m10-c", "m10-t", "m10-l", "m10-h", "m10-tm"] },
        { id: "m10-c", label: "Cód: PAMQESMA006", typeId: "parameter", x: 1850, y: 800, connections: [] },
        { id: "m10-t", label: "Prod: Div", typeId: "parameter", x: 1950, y: 850, connections: [] },
        { id: "m10-l", label: "Comp: 1000 mm", typeId: "parameter", x: 2050, y: 800, connections: [] },
        { id: "m10-h", label: "Alt Prod: Ilimitado", typeId: "parameter", x: 2150, y: 850, connections: [] },
        { id: "m10-tm", label: "Auto", typeId: "parameter", x: 2250, y: 800, connections: [] },
      ]
    };

    // Add example flows if they don't exist
    if (!loadedFlows.find(f => f.id === "example-flow-1")) {
      loadedFlows.push(exampleFlow1);
    }
    if (!loadedFlows.find(f => f.id === "example-flow-2")) {
      loadedFlows.push(exampleFlow2);
    }
    if (!loadedFlows.find(f => f.id === "example-flow-3-v2")) {
      loadedFlows.push(exampleFlow3);
    }

    // Save updated flows
    localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(loadedFlows));

    setFlows(loadedFlows);

    // 2. Load Last Active Flow OR Default Storage
    const lastFlowId = localStorage.getItem(LAST_FLOW_KEY);
    if (lastFlowId) {
      const foundFlow = loadedFlows.find(f => f.id === lastFlowId);
      if (foundFlow) {
        setNodes(foundFlow.nodes);
        setNodeTypes(foundFlow.nodeTypes);
        setHistory([{ nodes: foundFlow.nodes, types: foundFlow.nodeTypes }]);
        setHistoryIndex(0);
        setCurrentFlowName(foundFlow.name);
        setCurrentFlowId(foundFlow.id); // Set Active
        toast({ title: "Fluxo Restaurado", description: `Restauramos o último fluxo acessado: ${foundFlow.name}` });
        return;
      }
    }

    // Fallback: Load generic storage if no last flow found
    const loadedData = localStorage.getItem(STORAGE_KEY);
    if (loadedData) {
      try {
        const parsed = JSON.parse(loadedData);
        if (parsed.nodes && parsed.nodeTypes) {
          setNodes(parsed.nodes);
          setNodeTypes(parsed.nodeTypes);
          setHistory([{ nodes: parsed.nodes, types: parsed.nodeTypes }]);
          setHistoryIndex(0);
          setCurrentFlowName("Rascunho Recuperado");
          setCurrentFlowId(null); // It is a draft
          return;
        }
      } catch (e) {
        console.error("Failed to load mind map", e);
      }
    }
    setHistory([{ nodes: initialNodes, types: defaultNodeTypes }]);
    setHistoryIndex(0);
  }, []);

  const handleSaveFlow = () => {
    if (!flowNameInput) return;
    const newFlow: Flow = {
      id: Date.now().toString(),
      name: flowNameInput,
      nodes: nodes,
      nodeTypes: nodeTypes,
      timestamp: Date.now()
    };
    const updatedFlows = [...flows, newFlow];
    setFlows(updatedFlows);
    localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));
    localStorage.setItem(LAST_FLOW_KEY, newFlow.id); // FIX: Ensure this new flow is the one loaded next time
    toast({
      title: "Fluxo Salvo",
      description: `O fluxo "${flowNameInput}" foi salvo com sucesso.`,
      className: "bg-green-500 text-white border-green-600"
    });
    setCurrentFlowName(flowNameInput);
    setCurrentFlowId(newFlow.id); // Set Active
    setIsFlowNameDialogOpen(false);
    setFlowNameInput("");
  };

  const handleLoadFlow = (flow: Flow) => {
    setNodes(flow.nodes);
    setNodeTypes(flow.nodeTypes);
    setHistory([{ nodes: flow.nodes, types: flow.nodeTypes }]);
    setHistoryIndex(0);
    setCurrentFlowName(flow.name);
    setCurrentFlowId(flow.id); // Set Active
    localStorage.setItem(LAST_FLOW_KEY, flow.id);
    toast({
      title: "Fluxo Carregado",
      description: `O fluxo "${flow.name}" foi carregado.`,
    });
  };

  const handleDeleteFlow = (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation();
    const updatedFlows = flows.filter(f => f.id !== flowId);
    setFlows(updatedFlows);
    localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));
    toast({
      title: "Fluxo Excluído",
      description: "O fluxo foi removido da lista.",
      variant: "destructive"
    });
  };

  // --- Initialization & Persistence ---

  // Old useEffect removed/merged above
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);

  // --- Initialization & Persistence ---

  useEffect(() => {
    // 1. Load Flows
    const loadedFlowsStr = localStorage.getItem(FLOWS_STORAGE_KEY);
    let loadedFlows: Flow[] = [];
    if (loadedFlowsStr) {
      try {
        loadedFlows = JSON.parse(loadedFlowsStr);
      } catch (e) {
        console.error("Failed to load flows", e);
      }
    }

    // ... (Example flows logic remains implicitly handled if we don't clear them, but let's keep it safe by just relying on loadedFlows logic or re-injecting if needed. For brevity, assuming flows exist or will be handled by the user saving new ones, but ideally we keep the injection logic if possible. Since we are replacing a block, we need to be careful not to delete the injection logic if it was in the selected range.
    // Actually, looking at the previous file content, the injection logic was lines 128-278. I should probably TARGET a smaller block to avoid deleting that, or include it.
    // The previously viewed code ended at line 375 for saveToStorage.
    // Let's just update the saveToStorage function and the initial state declaration.

    // Better strategy: Use multiple replacements.
  }, []); // We are not replacing the big useEffect here.

  // ...

  const saveToStorage = () => {
    // If we are editing a specific flow, update it
    if (currentFlowId) {
      const updatedFlows = flows.map(f => {
        if (f.id === currentFlowId) {
          return {
            ...f,
            nodes: nodes,
            nodeTypes: nodeTypes,
            timestamp: Date.now()
          };
        }
        return f;
      });
      setFlows(updatedFlows);
      localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));
      localStorage.setItem(LAST_FLOW_KEY, currentFlowId);
      toast({
        title: "Fluxo Atualizado",
        description: "As alterações foram salvas no fluxo atual.",
        className: "bg-green-500 text-white border-green-600"
      });
      return;
    }

    // Fallback: Save to Draft (Generic Storage)
    const dataToSave = { nodes, nodeTypes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    localStorage.removeItem(LAST_FLOW_KEY); // FORCE load from draft next time
    toast({
      title: "Rascunho Salvo",
      description: "Mapa salvo como rascunho. (Não é um fluxo nomeado)",
      duration: 3000,
      className: "bg-green-500 text-white border-green-600"
    });
  };

  const addToHistory = (newNodes: MindMapNode[], newTypes: NodeType[] = nodeTypes) => {
    if (!isAdmin) {
      setNodes(newNodes);
      setNodeTypes(newTypes);
      return;
    }
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: newNodes, types: newTypes });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setNodes(newNodes);
    setNodeTypes(newTypes);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setNodes(prevState.nodes);
      setNodeTypes(prevState.types);
    }
  };

  // --- Layout & Visibility Calculation ---

  const { visibleSet, hiddenOrigins } = useMemo(() => {
    const visible = new Set<string>();
    const origins: Record<string, { x: number, y: number }> = {};
    const incomingEdgesMap: Record<string, string[]> = {};

    nodes.forEach(n => {
      n.connections.forEach(targetId => {
        if (!incomingEdgesMap[targetId]) incomingEdgesMap[targetId] = [];
        incomingEdgesMap[targetId].push(n.id);
      });
    });

    const roots = nodes.filter(n => !incomingEdgesMap[n.id] || incomingEdgesMap[n.id].length === 0);
    const stateMap: Record<string, { status: 'visible' } | { status: 'hidden', x: number, y: number }> = {};

    roots.forEach(r => { stateMap[r.id] = { status: 'visible' }; });

    let changed = true;
    let loops = 0;
    while (changed && loops < nodes.length * 2) {
      changed = false;
      nodes.forEach(n => {
        const parents = incomingEdgesMap[n.id] || [];
        if (parents.length === 0) return;

        const visibleParent = parents.find(pid => {
          const pState = stateMap[pid];
          const pNode = nodes.find(x => x.id === pid);
          return pState?.status === 'visible' && pNode && !pNode.collapsed;
        });

        if (visibleParent) {
          if (!stateMap[n.id] || stateMap[n.id].status !== 'visible') {
            stateMap[n.id] = { status: 'visible' };
            changed = true;
          }
        } else {
          let ancestorState: { x: number, y: number } | null = null;
          for (const pid of parents) {
            const pState = stateMap[pid];
            const pNode = nodes.find(x => x.id === pid);

            if (!pState) continue;

            if (pState.status === 'visible' && pNode?.collapsed) {
              ancestorState = { x: pNode.x, y: pNode.y };
              break;
            } else if (pState.status === 'hidden') {
              ancestorState = { x: pState.x, y: pState.y };
              break;
            }
          }

          if (ancestorState) {
            const current = stateMap[n.id];
            if (!current || (current.status === 'hidden' && (current.x !== ancestorState.x || current.y !== ancestorState.y))) {
              stateMap[n.id] = { status: 'hidden', x: ancestorState.x, y: ancestorState.y };
              changed = true;
            }
          }
        }
      });
      loops++;
    }

    Object.entries(stateMap).forEach(([id, state]) => {
      if (state.status === 'visible') visible.add(id);
      else origins[id] = { x: state.x, y: state.y };
    });

    if (selectedNodeId && !visible.has(selectedNodeId)) visible.add(selectedNodeId);

    return { visibleSet: visible, hiddenOrigins: origins };
  }, [nodes, selectedNodeId]);


  const activeFlowNodes = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const flowSet = new Set<string>();
    const queue = [hoveredNodeId];
    flowSet.add(hoveredNodeId);
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = nodes.find(n => n.id === currentId);
      if (node && !node.collapsed) {
        node.connections.forEach(targetId => {
          if (!flowSet.has(targetId) && visibleSet.has(targetId)) {
            flowSet.add(targetId);
            queue.push(targetId);
          }
        });
      }
    }
    return flowSet;
  }, [hoveredNodeId, nodes, visibleSet]);


  // --- Canvas Interaction ---

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const zoomIntensity = 0.0015;
    const { x, y, scale } = viewState;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - x) / scale;
    const worldY = (mouseY - y) / scale;
    const delta = -e.deltaY;
    const newScale = Math.min(Math.max(scale * (1 + delta * zoomIntensity), 0.1), 5);
    const newX = mouseX - (worldX * newScale);
    const newY = mouseY - (worldY * newScale);
    setViewState({ x: newX, y: newY, scale: newScale });
  };

  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && !draggingNodeId) {
      setIsDraggingCanvas(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - viewState.x) / viewState.scale;
    const mouseY = (e.clientY - rect.top - viewState.y) / viewState.scale;
    setMousePos({ x: mouseX, y: mouseY });

    if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (draggingNodeId && isAdmin) {
      const dx = (e.clientX - lastMousePos.x) / viewState.scale;
      const dy = (e.clientY - lastMousePos.y) / viewState.scale;

      // Define collision boundaries
      const COLLISION_HALF_WIDTH = 180;
      const COLLISION_HALF_HEIGHT = 60;

      setNodes(prev => {
        const draggingNode = prev.find(n => n.id === draggingNodeId);
        if (!draggingNode) return prev;

        const newX = draggingNode.x + dx;
        const newY = draggingNode.y + dy;

        // Smart collision: Allow separation, block only getting closer
        const hasBlockingCollision = prev.some(n => {
          if (n.id === draggingNodeId) return false;
          if (!visibleSet.has(n.id)) return false;

          const currentXDist = Math.abs(n.x - draggingNode.x);
          const currentYDist = Math.abs(n.y - draggingNode.y);
          const newXDist = Math.abs(n.x - newX);
          const newYDist = Math.abs(n.y - newY);

          const inCollisionZone = newXDist < COLLISION_HALF_WIDTH && newYDist < COLLISION_HALF_HEIGHT;

          if (!inCollisionZone) return false;

          const gettingCloserX = newXDist < currentXDist;
          const gettingCloserY = newYDist < currentYDist;

          return (gettingCloserX || newXDist === currentXDist) &&
            (gettingCloserY || newYDist === currentYDist);
        });

        if (hasBlockingCollision) {
          return prev;
        }

        // --- SMART DRAG LOGIC ---
        // If node is collapsed, find all invisible descendants and move them too
        const nodesToMove = new Set<string>([draggingNodeId]);

        if (draggingNode.collapsed) {
          const findDescendants = (parentId: string) => {
            prev.forEach(child => {
              // Optimization: In a real graph we would use an adj map, scanning array is O(N^2) worst case but fine for <1000 nodes.
              // Actually we have connections on the parent, so usage is:
              const parent = prev.find(p => p.id === parentId);
              if (parent) {
                parent.connections.forEach(connId => {
                  if (!nodesToMove.has(connId)) {
                    nodesToMove.add(connId);
                    findDescendants(connId);
                  }
                });
              }
            });
          };
          // Better recursive using the node we have
          const collectHiddenChildren = (node: MindMapNode) => {
            node.connections.forEach(childId => {
              const child = prev.find(c => c.id === childId);
              if (child && !nodesToMove.has(childId)) {
                nodesToMove.add(childId);
                collectHiddenChildren(child);
              }
            });
          };
          collectHiddenChildren(draggingNode);
        }

        return prev.map(n =>
          nodesToMove.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n
        );
      });
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    if (draggingNodeId) {
      addToHistory(nodes);
      setDraggingNodeId(null);
    }
  };

  // --- Search & Global Controls ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [currentFlowName, setCurrentFlowName] = useState<string>("Sem Nome");

  const focusOnNode = (nodeId: string) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode || !containerRef.current) return;

    // 1. Expand parents if hidden
    const nodesToUpdate = [...nodes];
    let needsUpdate = false;

    // Backward traversal to find parents
    const ensureVisible = (id: string) => {
      const parents = nodesToUpdate.filter(n => n.connections.includes(id));
      parents.forEach(p => {
        if (p.collapsed) {
          p.collapsed = false;
          needsUpdate = true;
        }
        ensureVisible(p.id);
      });
    };

    ensureVisible(targetNode.id);

    if (needsUpdate) {
      setNodes(nodesToUpdate);
      // Wait for render to update layout before centering? 
      // In this sync state update, it should be fine as we calculate target position from node data which is already there.
    }

    // 2. Center View on Node
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // We want: targetNode.x * scale + x = centerX
    // So: x = centerX - targetNode.x * scale
    const targetScale = 1.5; // Zoom in for search result
    const newX = centerX - targetNode.x * targetScale;
    const newY = centerY - targetNode.y * targetScale;

    setViewState({ x: newX, y: newY, scale: targetScale });

    // 3. Highlight
    setHighlightedNodeId(targetNode.id);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setHighlightedNodeId(null);
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const matches = nodes.filter(n => n.label.toLowerCase().includes(query.toLowerCase()));
    const matchIds = matches.map(n => n.id);
    setSearchResults(matchIds);
    setCurrentSearchIndex(0);

    if (matchIds.length > 0) {
      focusOnNode(matchIds[0]);
    } else {
      setHighlightedNodeId(null);
    }
  };

  const handleNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    focusOnNode(searchResults[nextIndex]);
  };

  const handlePrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    focusOnNode(searchResults[prevIndex]);
  };

  const handleToggleAll = () => {
    const anyCollapsed = nodes.some(n => n.collapsed);
    const newNodes = nodes.map(n => ({ ...n, collapsed: !anyCollapsed }));
    addToHistory(newNodes);
    toast({
      title: anyCollapsed ? "Expandido Tudo" : "Recolhido Tudo",
      description: anyCollapsed ? "Todos os nós foram expandidos." : "Todos os nós foram recolidos.",
    });
  };

  // --- Auto Layout Logic ---
  const handleAutoLayout = (rootNodeId: string) => {
    const rootNode = nodes.find(n => n.id === rootNodeId);
    if (!rootNode) return;

    // 1. Build Tree Structure
    const adjList: Record<string, string[]> = {};

    nodes.forEach(n => {
      n.connections.forEach(targetId => {
        if (!adjList[n.id]) adjList[n.id] = [];
        adjList[n.id].push(targetId);
      });
    });

    // 2. BFS/DFS to find all descendants
    const descendants = new Set<string>();
    const getDescendants = (id: string) => {
      const children = adjList[id] || [];
      children.forEach(childId => {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          getDescendants(childId);
        }
      });
    };
    getDescendants(rootNodeId);

    // 3. Layout Algorithm (Simple Tree)
    const newPositions: Record<string, { x: number, y: number }> = {};
    const LEVEL_HEIGHT = 120; // Vertical spacing
    const SIBLING_GAP = 180; // Horizontal spacing

    // --- Simpler Layout Approach: Recursive Width Calculation ---
    const subtreeWidths: Record<string, number> = {};

    const calculateWidth = (pid: string): number => {
      const children = adjList[pid] || [];
      if (children.length === 0) {
        subtreeWidths[pid] = SIBLING_GAP;
        return SIBLING_GAP;
      }

      let width = 0;
      children.forEach(cid => {
        width += calculateWidth(cid);
      });
      subtreeWidths[pid] = Math.max(width, SIBLING_GAP); // Ensure parent has at least minimal width
      return subtreeWidths[pid];
    };

    calculateWidth(rootNodeId);

    // Second Pass: Assign X,Y
    const applyPositions = (pid: string, x: number, y: number) => {
      // Parent is positioned at x (center of its allocated space)
      newPositions[pid] = { x, y };

      const children = adjList[pid] || [];
      if (children.length === 0) return;

      const totalW = subtreeWidths[pid];
      let currentLeft = x - (totalW / 2);

      children.forEach(cid => {
        const childW = subtreeWidths[cid];
        // Center of child is: currentLeft + childW/2
        const childX = currentLeft + (childW / 2);
        applyPositions(cid, childX, y + LEVEL_HEIGHT);
        currentLeft += childW;
      });
    };

    applyPositions(rootNodeId, rootNode.x, rootNode.y);

    // Apply to state
    const updatedNodes = nodes.map(n => {
      if (newPositions[n.id]) {
        return { ...n, x: newPositions[n.id].x, y: newPositions[n.id].y };
      }
      return n;
    });

    addToHistory(updatedNodes);
    toast({
      title: "Layout Automático",
      description: "Os nós foram organizados automaticamente.",
      className: "bg-blue-500 text-white border-blue-600"
    });
  };

  // --- Category Management ---

  const handleOpenCategoryDialog = (categoryToEdit?: NodeType) => {
    if (categoryToEdit) {
      setEditingCategory(categoryToEdit);
      setCategoryNameInput(categoryToEdit.label);
      setCategoryColorInput(categoryToEdit.color);
      setCategoryIconInput(categoryToEdit.icon);
    } else {
      setEditingCategory(null);
      setCategoryNameInput("");
      setCategoryColorInput("#3b82f6");
      setCategoryIconInput("box");
    }
    setIsCategoryDialogOpen(true);
  };
  // ... (existing code) ...

  // NOTE: Make sure to update Initial Load and Save/Load handlers to update currentFlowName

  // ...

  const handleSaveCategory = () => {
    if (!categoryNameInput) return;
    if (editingCategory) {
      const updatedTypes = nodeTypes.map(t =>
        t.id === editingCategory.id
          ? { ...t, label: categoryNameInput, color: categoryColorInput, icon: categoryIconInput }
          : t
      );
      setNodeTypes(updatedTypes);
      addToHistory(nodes, updatedTypes);
    } else {
      const id = categoryNameInput.toLowerCase().replace(/\s+/g, '-');
      if (nodeTypes.some(t => t.id === id)) {
        toast({ title: "Erro", description: "Já existe uma categoria com este nome/ID", variant: "destructive" });
        return;
      }
      const newType: NodeType = {
        id,
        label: categoryNameInput,
        color: categoryColorInput,
        icon: categoryIconInput
      };
      const newTypes = [...nodeTypes, newType];
      setNodeTypes(newTypes);
      addToHistory(nodes, newTypes);
    }
    setIsCategoryDialogOpen(false);
  };

  const handleDeleteCategory = (typeId: string) => {
    if (nodes.some(n => n.typeId === typeId)) {
      toast({ title: "Ação Negada", description: "Não é possível excluir uma categoria que está sendo usada no mapa.", variant: "destructive" });
      return;
    }
    const newTypes = nodeTypes.filter(t => t.id !== typeId);
    setNodeTypes(newTypes);
    addToHistory(nodes, newTypes);
  };

  const handleToggleCollapse = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    const newNodes = nodes.map(n => n.id === id ? { ...n, collapsed: !n.collapsed } : n);
    addToHistory(newNodes);
  };

  const handleAddNode = (typeId: string, parentId?: string) => {
    const parent = parentId ? nodes.find(n => n.id === parentId) : null;
    const startX = parent ? parent.x + 200 : (-viewState.x + 400) / viewState.scale;
    const startY = parent ? parent.y : (-viewState.y + 300) / viewState.scale;

    const nodeType = nodeTypes.find(t => t.id === typeId);
    if (!nodeType) return;

    const newNodeId = Date.now().toString();
    const newNode: MindMapNode = {
      id: newNodeId,
      label: nodeType.label,
      typeId,
      x: startX + (Math.random() * 40 - 20),
      y: startY + (Math.random() * 40 - 20),
      connections: [],
      collapsed: false
    };

    let newNodes = [...nodes, newNode];
    if (parentId) {
      newNodes = newNodes.map(n =>
        n.id === parentId
          ? { ...n, connections: [...n.connections, newNodeId] }
          : n
      );
    }
    addToHistory(newNodes);
  };

  const handleStartConnection = (nodeId: string) => {
    setConnectingNodeId(nodeId);
    setSelectedNodeId(null);
  };

  const handleConnectionComplete = (targetId: string) => {
    if (connectingNodeId && connectingNodeId !== targetId) {
      const sourceNode = nodes.find(n => n.id === connectingNodeId);
      if (sourceNode && !sourceNode.connections.includes(targetId)) {
        const newNodes = nodes.map(n =>
          n.id === connectingNodeId
            ? { ...n, connections: [...n.connections, targetId] }
            : n
        );
        addToHistory(newNodes);
      }
    }
    setConnectingNodeId(null);
  };

  const handleEditSave = () => {
    if (editingId) {
      const newNodes = nodes.map(n => n.id === editingId ? { ...n, label: editLabel } : n);
      addToHistory(newNodes);
      setEditingId(null);
      setEditLabel("");
    }
  };

  const handleDeleteNode = (id: string) => {
    const newNodes = nodes
      .filter(n => n.id !== id)
      .map(n => ({ ...n, connections: n.connections.filter(c => c !== id) }));
    addToHistory(newNodes);
  };

  const hexToRgba = (hex: string, alpha: number) => {
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('hsl')) return hex.replace(')', ` / ${alpha})`);
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const activeConnectionLayers = useMemo(() => {
    const inactive: JSX.Element[] = [];
    const active: JSX.Element[] = [];

    nodes.filter(n => visibleSet.has(n.id) && !n.collapsed).forEach((node) => {
      node.connections.forEach((targetId) => {
        const target = nodes.find(n => n.id === targetId);
        if (!target || !visibleSet.has(targetId)) return;

        const isFlowing = activeFlowNodes.has(node.id) && activeFlowNodes.has(targetId);

        // Calcular comprimento real da linha para animação precisa
        const dx = target.x - node.x;
        const dy = target.y - node.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);

        const element = (
          <line
            key={`${node.id}-${targetId}`}
            x1={node.x}
            y1={node.y}
            x2={target.x}
            y2={target.y}
            stroke={isFlowing ? "hsl(var(--primary))" : "#555"}
            strokeWidth={isFlowing ? "3" : "2"}
            className={cn("transition-all duration-500", isFlowing && "animate-flow drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]")}
            strokeDasharray={isFlowing ? "12 4" : "none"}
            style={{
              '--line-length': lineLength
            } as React.CSSProperties}
          />
        );

        if (isFlowing) active.push(element);
        else inactive.push(element);
      });
    });

    return { active, inactive };
  }, [nodes, visibleSet, activeFlowNodes /* nodeTypes removed from dep array as not used inside */]);


  // --- New Layout Utils ---
  const [isToolsOpen, setIsToolsOpen] = useState(true);

  return (
    <div className="h-full w-full flex relative overflow-hidden bg-[radial-gradient(circle_at_center,_hsl(0_0%_8%)_0%,_hsl(0_0%_4%)_100%)]">
      {/* Top Toolbar */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        {/* Undo Button - Relocated */}
        {isAdmin && !isViewMode && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-white bg-card/80 border border-border/30 hover:bg-muted hover:border-border/50 backdrop-blur-sm rounded-lg shadow-sm transition-all duration-300"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Desfazer"
          >
            <Undo className="w-4 h-4" />
          </Button>
        )}

        {/* Search Bar */}
        <div className={cn(
          "flex items-center bg-card/80 border border-border/30 rounded-lg backdrop-blur-sm transition-all duration-300 overflow-hidden",
          searchQuery ? "w-64 shadow-lg ring-1 ring-primary/20" : "w-10 hover:w-64"
        )}>
          <div className="h-10 w-10 flex items-center justify-center shrink-0 text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar máquina..."
            className="border-none bg-transparent h-10 w-full focus-visible:ring-0 px-0 text-sm placeholder:text-muted-foreground/50"
          />

          {searchResults.length > 0 && (
            <div className="flex items-center gap-1 mr-1 shrink-0">
              <span className="text-[10px] text-muted-foreground font-mono min-w-[30px] text-center">
                {currentSearchIndex + 1}/{searchResults.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handlePrevResult}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleNextResult}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}

          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 mr-1 text-muted-foreground hover:text-foreground"
              onClick={() => handleSearch("")}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Global Expand/Collapse */}
        <Button
          onClick={handleToggleAll}
          size="icon"
          className="h-10 w-10 rounded-lg bg-card/80 text-foreground border border-border/30 hover:bg-muted hover:border-border/50 backdrop-blur-sm shadow-sm transition-all duration-300"
          title="Expandir/Recolher Tudo"
        >
          {nodes.some(n => n.collapsed) ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </Button>

        <Button
          onClick={() => setIsViewMode(!isViewMode)}
          size="icon"
          className={cn(
            "h-10 w-10 rounded-lg hover:scale-105 transition-all duration-300 animate-fade-in shadow-sm",
            isViewMode
              ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
              : "bg-card/80 text-foreground border border-border/30 hover:bg-muted hover:border-border/50 backdrop-blur-sm"
          )}
        >
          {isViewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>

        {!isViewMode && (
          <>
            {isAdmin && (
              <Button
                onClick={saveToStorage}
                className="h-10 px-5 gap-2.5 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.25)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:scale-[1.02] transition-all duration-300 bg-primary hover:bg-primary/90 text-white border-none font-semibold text-sm tracking-wide"
              >
                <Save className="w-4 h-4" />
                <span>SALVAR</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 px-4 gap-2.5 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-300 bg-card/80 hover:bg-card text-foreground border border-border/30 hover:border-primary/40 font-medium text-sm backdrop-blur-sm min-w-[140px] justify-between">
                  <div className="flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate max-w-[150px] text-left">
                      {currentFlowName && currentFlowName !== "Sem Nome" ? currentFlowName : "Fluxos"}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border/50 text-foreground shadow-2xl">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                  {flows.length === 0 && (
                    <div className="text-xs text-muted-foreground p-4 text-center">Nenhum fluxo salvo</div>
                  )}
                  {flows.map(flow => (
                    <DropdownMenuItem key={flow.id} className="flex justify-between items-center cursor-pointer hover:bg-primary/10 focus:bg-primary/10 transition-colors group" onClick={() => handleLoadFlow(flow)}>
                      <span className="truncate flex-1 font-medium group-hover:text-primary transition-colors">{flow.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive" onClick={(e) => handleDeleteFlow(e, flow.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-2">
                  <Button className="w-full h-8 text-xs gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 hover:border-primary transition-all" size="sm" onClick={() => setIsFlowNameDialogOpen(true)}>
                    <Plus className="w-3 h-3" /> Criar Novo Fluxo
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isFlowNameDialogOpen} onOpenChange={setIsFlowNameDialogOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Salvar Novo Fluxo</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="flowName">Nome do Fluxo</Label>
                    <Input id="flowName" value={flowNameInput} onChange={(e) => setFlowNameInput(e.target.value)} placeholder="Ex: Processo de Produção A" />
                  </div>
                </div>
                <DialogFooter><Button onClick={handleSaveFlow} disabled={!flowNameInput}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Floating Vertical Toolbar - With Animation and Toggle */}
      {
        isAdmin && !isViewMode && (
          <div className="absolute top-8 left-4 z-40 flex flex-col items-start gap-2">

            {/* Sidebar Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-white bg-card/80 border border-border/30 hover:bg-muted hover:border-border/50 backdrop-blur-sm rounded-lg shadow-sm transition-all duration-300"
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              title={isToolsOpen ? "Ocultar Ferramentas" : "Mostrar Ferramentas"}
            >
              <div className={cn("transition-transform duration-300", isToolsOpen ? "rotate-180" : "rotate-0")}>
                <Box className="w-5 h-5" />
              </div>
            </Button>

            {/* Sidebar Content */}
            <div className={cn(
              "glass-card p-2 rounded-xl pointer-events-auto flex flex-col gap-2 shadow-xl border border-white/10 w-[240px] bg-black/40 backdrop-blur-md transition-all duration-500 ease-in-out origin-top-left overflow-hidden",
              isToolsOpen ? "opacity-100 max-h-[800px] scale-100 translate-y-0" : "opacity-0 max-h-0 scale-95 -translate-y-4 pointer-events-none"
            )}>
              <div className="flex justify-between items-center px-1 pb-1 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ferramentas de Criação</span>
              </div>
              <div className="h-px bg-white/10 mx-1 mb-1" />
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1">
                {nodeTypes.map((type) => {
                  const Icon = ICON_MAP[type.icon] || Box;
                  return (
                    <div key={type.id} className="group flex items-center gap-1 relative pl-1 pr-1">
                      <Button variant="outline" className="flex-1 justify-start gap-3 h-10 relative overflow-hidden bg-transparent border-white/5 hover:border-white/20 hover:bg-white/5 transition-all text-left" onClick={() => handleAddNode(type.id)}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: type.color }} />
                        <Icon className="w-4 h-4 shrink-0 transition-colors" style={{ color: type.color }} />
                        <span className="truncate text-xs font-medium text-gray-300 group-hover:text-white">{type.label}</span>
                      </Button>
                      {/* Edit Actions - Always visible but subdued */}
                      <div className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity bg-transparent rounded-r-md py-1 pr-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-blue-400 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); handleOpenCategoryDialog(type); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-400 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(type.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-primary justify-start px-2 h-8 text-xs mt-1 border border-dashed border-white/10 hover:border-primary/50" onClick={() => handleOpenCategoryDialog()}>
                    <Plus className="w-3 h-3" /> Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingCategory ? "Editar Categoria" : "Criar Nova Categoria"}</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome da Categoria</Label>
                      <Input id="name" value={categoryNameInput} onChange={(e) => setCategoryNameInput(e.target.value)} placeholder="Ex: Sensor, Operador..." />
                    </div>
                    <div className="grid gap-2">
                      <Label>Ícone</Label>
                      <div className="grid grid-cols-6 gap-2 p-2 border rounded-md">
                        {Object.entries(ICON_MAP).map(([key, Icon]) => (
                          <div key={key} className={cn("flex items-center justify-center p-2 rounded cursor-pointer hover:bg-primary/20 transition-colors", categoryIconInput === key && "bg-primary text-primary-foreground")} onClick={() => setCategoryIconInput(key)}>
                            <Icon className="w-5 h-5" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Cor da Categoria</Label>
                      <div className="flex gap-2 flex-wrap">
                        {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#64748b', '#ffffff'].map(color => (
                          <div key={color} className={cn("w-8 h-8 rounded-full cursor-pointer ring-2 ring-transparent hover:scale-110 transition-transform", categoryColorInput === color && "ring-white")} style={{ backgroundColor: color }} onClick={() => setCategoryColorInput(color)} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleSaveCategory} disabled={!categoryNameInput}>{editingCategory ? "Salvar Alterações" : "Criar"}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )
      }

      {
        connectingNodeId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-primary text-primary-foreground px-6 py-2 rounded-full shadow-2xl border border-primary-foreground/20 animate-in fade-in slide-in-from-top-4 flex items-center gap-4">
              <span className="font-semibold text-sm">Selecione o destino da conexão</span>
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full pointer-events-auto" onClick={() => setConnectingNodeId(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )
      }

      <div
        ref={containerRef}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="w-full h-full transform-gpu origin-top-left transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`
          }}
        >
          <svg className="absolute top-0 left-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible" style={{ transform: 'translate(-5000px, -5000px)', zIndex: 0 }}>
            <g transform="translate(5000, 5000)">
              {activeConnectionLayers.inactive}
            </g>
          </svg>

          <svg className="absolute top-0 left-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible" style={{ transform: 'translate(-5000px, -5000px)', zIndex: hoveredNodeId ? 20 : 0 }}>
            <g transform="translate(5000, 5000)">
              {activeConnectionLayers.active}

              {connectingNodeId && (
                <line x1={nodes.find(n => n.id === connectingNodeId)?.x || 0} y1={nodes.find(n => n.id === connectingNodeId)?.y || 0} x2={mousePos.x} y2={mousePos.y} stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
              )}
            </g>
          </svg>

          {nodes.map((node) => {
            const isVisible = visibleSet.has(node.id);
            const hiddenOrigin = hiddenOrigins[node.id];

            const targetX = isVisible ? node.x : (hiddenOrigin?.x ?? node.x);
            const targetY = isVisible ? node.y : (hiddenOrigin?.y ?? node.y);
            const scale = isVisible ? 1 : 0.05;
            const opacity = isVisible ? 1 : 0;

            const type = nodeTypes.find(t => t.id === node.typeId);
            const color = type?.color || "#555";
            const Icon = ICON_MAP[type?.icon || 'box'] || Box;
            const isSelected = selectedNodeId === node.id;
            const isConnecting = connectingNodeId === node.id;
            const isEditing = editingId === node.id;
            const isFlowActive = activeFlowNodes.has(node.id);
            // Important: Drag check to disable transition
            const isDragging = draggingNodeId === node.id;

            const bgStyle = type?.color.startsWith('hsl') ? type.color : hexToRgba(type?.color || '#555', 0.1);
            const borderStyle = type?.color.startsWith('hsl') ? type.color : hexToRgba(type?.color || '#555', 0.4);

            return (
              <div
                key={node.id}
                onMouseDown={(e) => { e.stopPropagation(); if (connectingNodeId) handleConnectionComplete(node.id); else { if (isAdmin) { setDraggingNodeId(node.id); setLastMousePos({ x: e.clientX, y: e.clientY }); } setSelectedNodeId(node.id); } }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2",
                  // Transition Logic: No transition during drag
                  isDragging ? "transition-none" : "transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)",
                  isSelected || isConnecting ? "z-30" : (isFlowActive ? "z-30" : "z-10"),
                  isVisible ? "" : "pointer-events-none"
                )}
                style={{
                  left: targetX,
                  top: targetY,
                  opacity: opacity,
                  transform: `translate(-50%, -50%) scale(${scale})`
                }}
              >
                <div
                  className={cn(
                    "relative rounded-full px-5 py-3 cursor-pointer shadow-lg group select-none flex items-center gap-3 transition-transform duration-300 hover:scale-105",
                    "min-w-fit", // Allow growth for text
                    isSelected && "ring-2 ring-white/50 scale-105",
                    isConnecting && "ring-2 ring-yellow-400 scale-105",
                    isFlowActive && "ring-2 ring-primary shadow-[0_0_30px_rgba(var(--primary),0.5)]",
                    highlightedNodeId === node.id && "animate-highlight-pulse"
                  )}
                  onDoubleClick={() => { if (isAdmin) { setEditingId(node.id); setEditLabel(node.label); } }}
                  style={{
                    backgroundColor: bgStyle.includes('hsl') ? `hsl(from ${color} h s l / 0.15)` : bgStyle,
                    borderColor: borderStyle.includes('hsl') ? `hsl(from ${color} h s l / 0.5)` : borderStyle,
                    borderWidth: '1px',
                    boxShadow: isSelected ? `0 0 25px ${borderStyle.includes('hsl') ? `hsl(from ${color} h s l / 0.4)` : hexToRgba(color, 0.4)}` : (isFlowActive ? `0 0 40px ${borderStyle.includes('hsl') ? `hsl(from ${color} h s l / 0.3)` : hexToRgba(color, 0.3)}` : 'none')
                  }}
                >
                  <Icon className={cn("w-4 h-4 shrink-0 opacity-80 transition-colors", isFlowActive && "text-primary animate-pulse")} style={{ color: !isFlowActive ? (color.startsWith('hsl') ? color : 'white') : undefined }} />

                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-1 min-w-[120px]">
                      <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="h-6 text-xs px-1 bg-black/50 border-none text-white w-full" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); }} />
                      <Button size="icon" variant="ghost" className="h-5 w-5 hover:bg-white/10" onClick={handleEditSave}><Check className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <span className={cn("text-sm font-medium text-white/90 whitespace-nowrap transition-colors", isFlowActive && "text-white glow-text")}>{node.label}</span>
                  )}

                  {/* Collapse Toggle */}
                  {node.connections.length > 0 && isVisible && (
                    <div
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors z-30"
                      onClick={(e) => handleToggleCollapse(e, node.id)}
                    >
                      {node.collapsed ? <ChevronRight className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-white" />}
                    </div>
                  )}

                  {/* Node Floating Actions */}
                  {isAdmin && isSelected && !isEditing && isVisible && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl animate-in fade-in zoom-in-95 z-30">
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); handleStartConnection(node.id); }}>
                        <LinkIcon className="w-4 h-4" />
                      </Button>

                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 hover:text-blue-400" onClick={(e) => { e.stopPropagation(); handleAutoLayout(node.id); }} title="Organizar Filhos Automaticamente">
                        <Wand2 className="w-4 h-4" />
                      </Button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 hover:text-green-400" onClick={(e) => e.stopPropagation()}>
                            <GitFork className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1 bg-[#1a1a1a] border-white/10 text-white" side="top">
                          <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">Adicionar Sub-item</div>
                          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {nodeTypes.map(t => {
                              const TIcon = ICON_MAP[t.icon] || Box;
                              return (
                                <Button key={t.id} variant="ghost" className="justify-start gap-2 h-8 text-xs font-normal" onClick={() => handleAddNode(t.id, node.id)}>
                                  <TIcon className="w-3 h-3" style={{ color: t.color }} />
                                  {t.label}
                                </Button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 hover:text-white" onClick={(e) => { e.stopPropagation(); setEditingId(node.id); setEditLabel(node.label); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <div className="w-px bg-white/10 mx-0.5" />
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 text-red-400 hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div >
  );
};

export default MindMapTab;
