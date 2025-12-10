import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isDeleting?: boolean;
}

export const DeleteConversationDialog: React.FC<DeleteConversationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "删除对话",
  description = "此操作无法撤销。这将永久删除该对话及其所有历史记录。",
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-full px-6"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              className="rounded-full px-6"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </Button>
          </div>
        </div>
      </div>
      {/* Click backdrop to close */}
      <div className="absolute inset-0 -z-10" onClick={isDeleting ? undefined : onClose} />
    </div>
  );
};

