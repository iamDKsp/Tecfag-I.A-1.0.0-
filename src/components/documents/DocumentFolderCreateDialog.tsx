import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DocumentFolderCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string) => void;
}

export const DocumentFolderCreateDialog = ({
    open,
    onOpenChange,
    onCreate,
}: DocumentFolderCreateDialogProps) => {
    const [name, setName] = useState("");

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name.trim());
            setName("");
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#1a1a1a] border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-white">Nova Pasta</DialogTitle>
                    <DialogDescription className="text-white/60">
                        Crie uma nova pasta para organizar seus documentos.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-white">
                            Nome da Pasta
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            placeholder="Ex: Catálogos, Manuais..."
                            className="bg-[#252525] border-white/10 text-white"
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setName("");
                            onOpenChange(false);
                        }}
                        className="bg-white/5 text-white hover:bg-white/10 border-white/10"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCreate}
                        className="bg-primary hover:bg-primary/90"
                        disabled={!name.trim()}
                    >
                        Criar Pasta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
