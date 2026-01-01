import { Cpu, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isAdmin: boolean;
  onToggleRole: () => void;
}

const Header = ({ isAdmin, onToggleRole }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Cpu className="w-8 h-8 text-primary animate-pulse-glow" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight">
              Tec <span className="text-gradient">I.A</span>
            </h1>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Industrial Intelligence
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleRole}
          className="gap-2"
        >
          {isAdmin ? (
            <>
              <Shield className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Admin</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Usuário</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
};

export default Header;
