import { useState } from "react";
import { ChevronDown, ChevronUp, Edit2, Save, X, Wrench, Gauge, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Machine {
  id: string;
  name: string;
  category: string;
  capacity: string;
  model: string;
  price: string;
  maintenanceStatus: "ok" | "attention" | "critical";
  lastMaintenance: string;
  specifications: string[];
}

interface CatalogTabProps {
  isAdmin: boolean;
}

const initialMachines: Machine[] = [
  {
    id: "1",
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
    id: "2",
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
    id: "3",
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
    id: "4",
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

const CatalogTab = ({ isAdmin }: CatalogTabProps) => {
  const [machines, setMachines] = useState<Machine[]>(initialMachines);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Machine>>({});

  const getStatusColor = (status: Machine["maintenanceStatus"]) => {
    switch (status) {
      case "ok":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "attention":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };

  const getStatusText = (status: Machine["maintenanceStatus"]) => {
    switch (status) {
      case "ok":
        return "Normal";
      case "attention":
        return "Atenção";
      case "critical":
        return "Crítico";
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingId(machine.id);
    setEditData(machine);
  };

  const handleSave = () => {
    if (!editingId || !editData) return;
    setMachines((prev) =>
      prev.map((m) => (m.id === editingId ? { ...m, ...editData } : m))
    );
    setEditingId(null);
    setEditData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Catálogo de Máquinas</h2>
            <p className="text-sm text-muted-foreground">
              {machines.length} equipamentos cadastrados
            </p>
          </div>
        </div>

        {/* Machine Cards */}
        {machines.map((machine, index) => {
          const isExpanded = expandedId === machine.id;
          const isEditing = editingId === machine.id;

          return (
            <div
              key={machine.id}
              className="glass-card overflow-hidden animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card Header */}
              <div
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  isExpanded && "bg-secondary/30"
                )}
                onClick={() => !isEditing && setExpandedId(isExpanded ? null : machine.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-primary uppercase tracking-wider">
                        {machine.category}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          getStatusColor(machine.maintenanceStatus)
                        )}
                      >
                        {getStatusText(machine.maintenanceStatus)}
                      </span>
                    </div>
                    {isEditing ? (
                      <Input
                        value={editData.name || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="text-lg font-semibold bg-secondary/50"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-lg font-semibold truncate">{machine.name}</h3>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isAdmin && !isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(machine);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSave();
                          }}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel();
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4" />
                    {isEditing ? (
                      <Input
                        value={editData.capacity || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, capacity: e.target.value }))
                        }
                        className="h-6 text-xs w-28"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span>{machine.capacity}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    {isEditing ? (
                      <Input
                        value={editData.price || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, price: e.target.value }))
                        }
                        className="h-6 text-xs w-28"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span>{machine.price}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" />
                    <span>Modelo: {machine.model}</span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/50 animate-fade-in">
                  <div className="grid md:grid-cols-2 gap-6 pt-4">
                    {/* Specifications */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-primary" />
                        Especificações Técnicas
                      </h4>
                      <ul className="space-y-2">
                        {machine.specifications.map((spec, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            {spec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Maintenance Info */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Manutenção
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full border text-xs",
                              getStatusColor(machine.maintenanceStatus)
                            )}
                          >
                            {getStatusText(machine.maintenanceStatus)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Última manutenção:</span>
                          <span>{machine.lastMaintenance}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CatalogTab;
