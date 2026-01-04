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

interface ChatRenameDialogProps {
    open: boolean;
    currentTitle: string;
    onOpenChange: (open: boolean) => void;
    onRename: (newTitle: string) => void;
}

export const ChatRenameDialog = ({
    open,
    currentTitle,
    onOpenChange,
    onRename,
}: ChatRenameDialogProps) => {
    const [title, setTitle] = useState(currentTitle);

    const handleSave = () => {
        if (title.trim()) {
            onRename(title.trim());
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#1a1a1a] border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-white">Renomear Chat</DialogTitle>
                    <DialogDescription className="text-white/60">
                        Digite um novo nome para este chat.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title" className="text-white">
                            Título
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            placeholder="Digite o novo título..."
                            className="bg-[#252525] border-white/10 text-white"
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="bg-white/5 text-white hover:bg-white/10 border-white/10"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-primary hover:bg-primary/90"
                        disabled={!title.trim()}
                    >
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
