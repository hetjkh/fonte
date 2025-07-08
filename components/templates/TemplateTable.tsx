"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from "@/components/ui/card";

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

interface TemplateTableProps {
  templates: Template[];
  isDeleting: { [key: string]: boolean };
  currentPage: number;
  totalPages: number;
  templatesPerPage: number;
  totalTemplates: number;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onPreview: (template: Template) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  setCurrentPage: (page: number) => void;
}

export default function TemplateTable({
  templates,
  isDeleting,
  currentPage,
  totalPages,
  templatesPerPage,
  totalTemplates,
  onEdit,
  onDelete,
  onPreview,
  onNextPage,
  onPrevPage,
  setCurrentPage
}: TemplateTableProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-800 rounded-xl bg-zinc-900/50">
        <div className="text-center p-8">
          <div className="h-16 w-16 text-zinc-600 mx-auto mb-4 flex items-center justify-center">
            📄
          </div>
          <h3 className="text-xl font-semibold text-zinc-300 mb-2">No Templates Found</h3>
          <p className="text-zinc-500 mb-6 max-w-md">You don't have any message templates yet. Create your first template to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-zinc-900">
              <TableHead className="text-zinc-400 font-semibold py-4 w-1/4 text-left">Name</TableHead>
              <TableHead className="text-zinc-400 font-semibold py-4 w-1/4 text-left">Message Type</TableHead>
              <TableHead className="text-zinc-400 font-semibold py-4 w-1/4 text-left">Message</TableHead>
              <TableHead className="text-zinc-400 font-semibold py-4 w-1/4 text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(template => (
              <TableRow key={template._id || Math.random().toString()} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="text-zinc-200 py-4 w-1/4 text-left">{template.name || 'Unnamed'}</TableCell>
                <TableCell className="text-zinc-200 py-4 w-1/4 text-left">{template.messageType || 'N/A'}</TableCell>
                <TableCell className="text-zinc-200 py-4 w-1/4 text-left">
                  <button
                    onClick={() => onPreview(template)}
                    className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>
                </TableCell>
                <TableCell className="text-zinc-200 py-4 w-1/4 text-left">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(template)}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                      disabled={isDeleting[template._id || ''] || !template._id}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => template._id && onDelete(template._id)}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                      disabled={isDeleting[template._id || ''] || !template._id}
                    >
                      {isDeleting[template._id || ''] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {templates.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-4 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 text-sm">
              Showing {(currentPage - 1) * templatesPerPage + 1}-{Math.min(currentPage * templatesPerPage, totalTemplates)} of {totalTemplates} templates
            </span>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                currentPage === 1
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 w-9 rounded-full transition-all duration-200 ${
                    currentPage === page
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                      : 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  aria-label={`Page ${page}`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={onNextPage}
              disabled={currentPage === totalPages}
              className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                currentPage === totalPages
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}