"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Template {
  _id?: string;
  name: string;
  messageType: string;
  template: {
    message: string;
    header?: string;
    footer?: string;
    button?: any[];
  };
}

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  previewContent: string;
  previewButtons: any[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
  previewContent,
  previewButtons,
  showToast
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Template Preview</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-zinc-400 leading-relaxed whitespace-pre-wrap mt-4">
          {previewContent}
        </DialogDescription>
        {previewButtons.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {previewButtons.map((btn, idx) => (
              <Button
                key={idx}
                variant={btn.type === 'URL' ? 'default' : 'outline'}
                className={
                  btn.type === 'URL'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-transparent border-zinc-500 text-zinc-200 hover:bg-zinc-700'
                }
                onClick={() => {
                  if (btn.type === 'URL' && btn.url) {
                    window.open(btn.url, '_blank');
                  } else {
                    showToast(`Quick Reply: ${btn.title || btn.name}`, 'success');
                  }
                }}
              >
                {btn.title || btn.name || `Button ${idx + 1}`}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}