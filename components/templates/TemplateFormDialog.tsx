"use client";

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, FileText, Bold, Italic, Strikethrough, List, Quote, Code, Plus, Minus, Link, Loader2 } from 'lucide-react';

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

interface Button {
  name: string;
  type: 'REPLY' | 'URL';
  url?: string;
  title?: string;
}

interface TemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingTemplate: Template | null;
  templateName: string;
  setTemplateName: (name: string) => void;
  messageType: string;
  setMessageType: (type: string) => void;
  message: string;
  setMessage: (message: string) => void;
  buttons: Button[];
  setButtons: (buttons: Button[]) => void;
  header: string;
  setHeader: (header: string) => void;
  footer: string;
  setFooter: (footer: string) => void;
  isSubmitting: boolean;
}

export default function TemplateFormDialog({
  open,
  onClose,
  onSubmit,
  editingTemplate,
  templateName,
  setTemplateName,
  messageType,
  setMessageType,
  message,
  setMessage,
  buttons,
  setButtons,
  header,
  setHeader,
  footer,
  setFooter,
  isSubmitting
}: TemplateFormDialogProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize editor content when modal opens or editingTemplate changes
  useEffect(() => {
    if (open && editorRef.current) {
      if (editingTemplate) {
        editorRef.current.innerText = editingTemplate.template.message || '';
        setMessage(editingTemplate.template.message || '');
      } else {
        editorRef.current.innerText = '';
        setMessage('');
      }
    }
  }, [open, editingTemplate, setMessage]);

  const applyFormatting = (format: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(format, false, format === 'formatBlock' ? 'blockquote' : undefined);
    setMessage(editor.innerText);
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    let text = editor.innerText;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const cursorPos = range.startOffset;

    const boldPattern = /\*\*(.*?)\*\*/g;
    const italicPattern = /\*(.*?)\*/g;
    const strikethroughPattern = /~~(.*?)~~/g;
    const bulletPattern = /^-\s(.*)$/gm;
    const quotePattern = /^>\s(.*)$/gm;
    const codePattern = /`(.*?)`/g;

    let modified = false;

    if (boldPattern.test(text)) {
      editor.innerHTML = text.replace(boldPattern, '<b>$1</b>');
      text = editor.innerText;
      modified = true;
    }
    if (italicPattern.test(text)) {
      editor.innerHTML = text.replace(italicPattern, '<i>$1</i>');
      text = editor.innerText;
      modified = true;
    }
    if (strikethroughPattern.test(text)) {
      editor.innerHTML = text.replace(strikethroughPattern, '<s>$1</s>');
      text = editor.innerText;
      modified = true;
    }
    if (bulletPattern.test(text)) {
      editor.innerHTML = text.replace(bulletPattern, '<ul><li>$1</li></ul>');
      text = editor.innerText;
      modified = true;
    }
    if (quotePattern.test(text)) {
      editor.innerHTML = text.replace(quotePattern, '<blockquote>$1</blockquote>');
      text = editor.innerText;
      modified = true;
    }
    if (codePattern.test(text)) {
      editor.innerHTML = text.replace(codePattern, '<code>$1</code>');
      text = editor.innerText;
      modified = true;
    }

    setMessage(text);

    if (modified && selection) {
      const newRange = document.createRange();
      const newSelection = window.getSelection();
      if (newSelection) {
        try {
          const targetNode = editor.firstChild || editor;
          const maxOffset = targetNode.nodeType === 3 ? targetNode.textContent?.length || 0 : editor.childNodes.length;
          const safeOffset = Math.min(cursorPos, maxOffset);
          newRange.setStart(targetNode, safeOffset);
          newRange.collapse(true);
          newSelection.removeAllRanges();
          newSelection.addRange(newRange);
        } catch (error) {
          console.warn('Failed to restore cursor position:', error);
          newRange.selectNodeContents(editor);
          newRange.collapse(false);
          newSelection.removeAllRanges();
          newSelection.addRange(newRange);
        }
      }
    }
  };

  const handleVariableSelect = (value: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const placeholder = value === 'name' ? '{{name}}' : value === 'phone' ? '{{phone}}' : `{{var${value.split(' ')[1]}}}`;
    range.insertNode(document.createTextNode(placeholder));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    setMessage(editor.innerText);
  };

  const handleButtonChange = (index: number, field: keyof Button, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    if (field === 'type' && value !== 'URL') {
      delete newButtons[index].url;
    }
    setButtons(newButtons);
  };

  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { name: '', type: 'REPLY' }]);
    }
  };

  const removeButton = (index: number) => {
    if (buttons.length > 1 && index > 0) {
      setButtons(buttons.filter((_, i) => i !== index));
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${open ? 'block' : 'hidden'}`}>
      <Card className="bg-zinc-900 border border-zinc-800 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 p-2 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-zinc-400 font-medium mb-2 block">Title</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <Input
                  className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                  placeholder="Enter template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-zinc-400 font-medium mb-2 block">Message Type</Label>
              <div className="relative">
                <select
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 h-12 transition-all duration-300 ease-in-out"
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                >
                  <option value="" disabled>Select message type</option>
                  <option value="Text">Text</option>
                  <option value="Buttons">Buttons</option>
                </select>
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
              </div>
            </div>
          </div>
          {messageType === 'Buttons' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 font-medium mb-2 block">Header</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <Input
                    className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                    placeholder="Enter header text"
                    value={header}
                    onChange={(e) => setHeader(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-400 font-medium mb-2 block">Footer</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <Input
                    className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                    placeholder="Enter footer text"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            <Label className="text-zinc-400 font-medium mb-2 block">Message</Label>
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap items-center">
                <select
                  className="pl-3 pr-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 h-10 transition-all duration-300 ease-in-out"
                  onChange={(e) => handleVariableSelect(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Insert variable</option>
                  <option value="name">Name</option>
                  <option value="phone">Phone</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={`variable ${i + 1}`}>
                      Variable {i + 1}
                    </option>
                    
                  ))}
                  <option value="" disabled>Add More variable limit 30</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyFormatting('bold')}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyFormatting('italic')}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyFormatting('strikeThrough')}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyFormatting('insertUnorderedList')}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyFormatting('formatBlock')}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                >
                  <Quote className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyFormatting('code')}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                >
                  <Code className="h-4 w-4" />
                </Button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-zinc-600"
                onInput={handleInput}
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '16px',
                }}
              />
            </div>
          </div>
          {messageType === 'Buttons' && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 font-medium">Buttons</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addButton}
                  disabled={buttons.length >= 3}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Button
                </Button>
              </div>
              {buttons.map((button, index) => (
                <div key={index} className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-200">{`Button ${index + 1}`}</h3>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeButton(index)}
                        className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 h-8 px-3"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-1">
                      <Label className="text-zinc-400 mb-2 block">Title</Label>
                      <Input
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                        placeholder={`Enter title for Button ${index + 1}`}
                        value={button.name}
                        onChange={(e) => handleButtonChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-zinc-400 mb-2 block">Type</Label>
                      <select
                        className="w-full pl-3 pr-4 py-3 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 h-12 transition-all duration-300 ease-in-out"
                        value={button.type}
                        onChange={(e) => handleButtonChange(index, 'type', e.target.value as Button['type'])}
                      >
                        <option value="REPLY">Quick Reply</option>
                        <option value="URL">URL</option>
                      </select>
                    </div>
                  </div>
                  {button.type === 'URL' && (
                    <div className="flex-1">
                      <Label className="text-zinc-400 mb-2 block">URL</Label>
                      <div className="relative">
                        <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                        <Input
                          className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                          placeholder="Enter URL"
                          value={button.url || ''}
                          onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-4 mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-12 px-6"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700 h-12 px-6"
              disabled={
                !templateName ||
                !messageType ||
                (!editorRef.current?.innerText && !message) ||
                (messageType === 'Buttons' && buttons.every(btn => btn.name.trim() === '')) ||
                (messageType === 'Buttons' && buttons.some(btn => btn.type === 'URL' && !btn.url)) ||
                isSubmitting
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {editingTemplate ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingTemplate ? 'Update Template' : 'Add Template'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}