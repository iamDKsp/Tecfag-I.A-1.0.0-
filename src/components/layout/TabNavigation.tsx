import { MessageSquare, Network, Package, Users, Activity, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TabType = "chat" | "mindmap" | "catalog" | "users" | "monitoring" | "documents";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isAdmin?: boolean;
}

const tabs = [
  { id: "chat" as const, label: "Chat IA", icon: MessageSquare, adminOnly: false },
  { id: "mindmap" as const, label: "Mapa Mental", icon: Network, adminOnly: false },
  { id: "catalog" as const, label: "Catálogo", icon: Package, adminOnly: false },
  { id: "users" as const, label: "Usuários", icon: Users, adminOnly: true },
  { id: "monitoring" as const, label: "Monitoramento", icon: Activity, adminOnly: true },
  { id: "documents" as const, label: "Documentos I.A", icon: FileStack, adminOnly: true },
];

const TabNavigation = ({ activeTab, onTabChange, isAdmin = false }: TabNavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl md:static md:border-t-0 md:border-b md:bg-transparent md:backdrop-blur-none">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around md:justify-start md:gap-2 py-2 md:py-4">
          {tabs.map((tab) => {
            // Hide admin-only tabs from non-admin users
            if (tab.adminOnly && !isAdmin) {
              return null;
            }

            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                variant="nav"
                data-active={isActive}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex-col md:flex-row gap-1 md:gap-2 h-auto py-2 px-4 md:px-6 rounded-xl transition-all duration-300",
                  isActive && "glow-effect"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive && "text-primary"
                )} />
                <span className="text-xs md:text-sm font-medium">{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default TabNavigation;
