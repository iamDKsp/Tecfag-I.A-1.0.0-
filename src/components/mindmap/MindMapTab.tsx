import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Zap, Settings, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MindMapNode {
  id: string;
  label: string;
  type: "machine" | "process" | "parameter";
  x: number;
  y: number;
  connections: string[];
}

interface MindMapTabProps {
  isAdmin: boolean;
}

const initialNodes: MindMapNode[] = [
  { id: "1", label: "Linha de Produção", type: "process", x: 50, y: 50, connections: ["2", "3", "4"] },
  { id: "2", label: "Envasadora", type: "machine", x: 20, y: 30, connections: ["5"] },
  { id: "3", label: "Seladora", type: "machine", x: 50, y: 30, connections: ["6"] },
  { id: "4", label: "Esteira", type: "machine", x: 80, y: 30, connections: [] },
  { id: "5", label: "Pressão: 2.5 bar", type: "parameter", x: 15, y: 10, connections: [] },
  { id: "6", label: "Temp: 180°C", type: "parameter", x: 55, y: 10, connections: [] },
];

const MindMapTab = ({ isAdmin }: MindMapTabProps) => {
  const [nodes, setNodes] = useState<MindMapNode[]>(initialNodes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const getNodeIcon = (type: MindMapNode["type"]) => {
    switch (type) {
      case "machine":
        return Cog;
      case "process":
        return Zap;
      case "parameter":
        return Settings;
    }
  };

  const getNodeStyle = (type: MindMapNode["type"]) => {
    switch (type) {
      case "machine":
        return "bg-primary/20 border-primary/50 text-primary-foreground";
      case "process":
        return "bg-accent/20 border-accent/50 text-accent-foreground";
      case "parameter":
        return "bg-secondary border-border text-secondary-foreground";
    }
  };

  const handleEditStart = (node: MindMapNode) => {
    if (!isAdmin) return;
    setEditingId(node.id);
    setEditLabel(node.label);
  };

  const handleEditSave = () => {
    if (!editingId) return;
    setNodes((prev) =>
      prev.map((node) =>
        node.id === editingId ? { ...node, label: editLabel } : node
      )
    );
    setEditingId(null);
    setEditLabel("");
  };

  const handleAddNode = (type: MindMapNode["type"]) => {
    const newNode: MindMapNode = {
      id: Date.now().toString(),
      label: `Novo ${type === "machine" ? "Máquina" : type === "process" ? "Processo" : "Parâmetro"}`,
      type,
      x: 50 + Math.random() * 20 - 10,
      y: 70 + Math.random() * 20 - 10,
      connections: [],
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== id));
    setSelectedNode(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      {isAdmin && (
        <div className="p-4 border-b border-border/50 bg-card/50">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddNode("machine")}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <Cog className="w-4 h-4" />
              Máquina
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddNode("process")}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <Zap className="w-4 h-4" />
              Processo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddNode("parameter")}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <Settings className="w-4 h-4" />
              Parâmetro
            </Button>
          </div>
        </div>
      )}

      {/* Mind Map Canvas */}
      <div className="flex-1 relative overflow-auto p-4 bg-[radial-gradient(circle_at_center,_hsl(0_0%_8%)_0%,_hsl(0_0%_4%)_100%)]">
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.map((node) =>
            node.connections.map((targetId) => {
              const target = nodes.find((n) => n.id === targetId);
              if (!target) return null;
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  stroke="hsl(0 72% 51% / 0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              );
            })
          )}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const Icon = getNodeIcon(node.type);
          const isEditing = editingId === node.id;
          const isSelected = selectedNode === node.id;

          return (
            <div
              key={node.id}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
                isSelected && "z-10"
              )}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div
                className={cn(
                  "glass-card border-2 rounded-xl p-3 min-w-[140px] cursor-pointer transition-all duration-200",
                  getNodeStyle(node.type),
                  isSelected && "ring-2 ring-primary glow-effect scale-105",
                  isAdmin && "hover:scale-105"
                )}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                onDoubleClick={() => handleEditStart(node)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-6 text-xs px-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={handleEditSave}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium truncate">{node.label}</span>
                  )}
                </div>

                {isAdmin && isSelected && !isEditing && (
                  <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleEditStart(node)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteNode(node.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 glass-card p-3 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">Legenda</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-primary/30 border border-primary/50" />
              <span>Máquina</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-accent/30 border border-accent/50" />
              <span>Processo</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-secondary border border-border" />
              <span>Parâmetro</span>
            </div>
          </div>
        </div>

        {!isAdmin && (
          <div className="absolute top-4 right-4 glass-card px-3 py-2 rounded-lg">
            <p className="text-xs text-muted-foreground">Modo visualização</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMapTab;
