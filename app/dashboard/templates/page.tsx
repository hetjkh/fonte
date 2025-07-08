"use client";

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Component imports
import TemplateHeader from '../../../components/templates/TemplateHeader';
import TemplateTable from '../../../components/templates/TemplateTable';
import TemplatePreviewDialog from '../../../components/templates/TemplatePreviewDialog';
import TemplateFormDialog from '../../../components/templates/TemplateFormDialog';
import ToastContainer from '../../../components/ToastContainer';

interface Template {
  _id?: string;
  name: string;
  messageType: string;
  template: {
    message: string;
    header?: string;
    footer?: string;
    button?: Button[];
  };
}

interface Button {
  name: string;
  type: 'REPLY' | 'URL';
  url?: string;
  title?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

export default function Templates() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [messageType, setMessageType] = useState('');
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [buttons, setButtons] = useState<Button[]>([{ name: '', type: 'REPLY' }]);
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const templatesPerPage = 10;
  const router = useRouter();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewButtons, setPreviewButtons] = useState<Button[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Enhanced toast system
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    const newToast: ToastMessage = {
      id,
      message,
      type,
      timestamp: Date.now()
    };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToken = async (): Promise<string | null | undefined> => {
    let token: string | null | undefined = Cookies.get('token');
    if (!token) {
      token = localStorage.getItem('token');
    }
    if (!token) {
      await new Promise(resolve => setTimeout(resolve, 500));
      token = Cookies.get('token') || localStorage.getItem('token');
    }
    return token;
  };

  const handleUnauthorized = () => {
    showToast('Session expired. Please log in again.', 'error');
    Cookies.remove('token', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    localStorage.removeItem('token');
    Cookies.remove('user', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    localStorage.removeItem('user');
    router.push('/');
  };

  // Optimized fetch templates with better error handling and faster loading
  const fetchTemplates = useCallback(async (showLoader = true) => {
    const token = await getToken();
    if (!token) {
      showToast('Please log in to access your templates', 'error');
      router.push('/');
      return;
    }

    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('https://whatsapp.recuperafly.com/api/template/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: currentPage,
          limit: templatesPerPage
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status) {
        const validTemplates = (data.templates || []).filter(
          (template: Template) => template && template._id
        );
        setTemplates(validTemplates);
        setTotalTemplates(data.total || 0);
      } else {
        showToast(data.message || 'Failed to fetch templates', 'error');
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          showToast('Request timeout. Please try again.', 'error');
        } else {
          showToast('Error fetching templates: ' + err.message, 'error');
        }
      } else {
        showToast('Unknown error occurred while fetching templates', 'error');
      }
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [router, currentPage, templatesPerPage]);

  // Load templates immediately on mount
  useEffect(() => {
    fetchTemplates();
  }, [currentPage]); // Only depend on currentPage for pagination

  const totalPages = Math.ceil(totalTemplates / templatesPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name || '');
      setMessageType(template.messageType || '');
      setButtons(
        template.template.button?.map(btn => ({
          name: btn.name || btn.title || '',
          type: btn.type as 'REPLY' | 'URL',
          url: btn.url,
        })) || [{ name: '', type: 'REPLY' }]
      );
      setHeader(template.messageType === 'Buttons' ? template.template.header || '' : '');
      setFooter(template.messageType === 'Buttons' ? template.template.footer || '' : '');
      setMessage(template.template.message || '');
    } else {
      setEditingTemplate(null);
      setTemplateName('');
      setMessageType('');
      setMessage('');
      setButtons([{ name: '', type: 'REPLY' }]);
      setHeader('');
      setFooter('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTemplateName('');
    setMessageType('');
    setMessage('');
    setButtons([{ name: '', type: 'REPLY' }]);
    setHeader('');
    setFooter('');
    setEditingTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    if (!token) {
      showToast('Please log in to save template', 'error');
      router.push('/');
      return;
    }

    setIsSubmitting(true);
    try {
      const messageContent = message || '';

      // Prepare payload based on whether we're editing or creating
      const payload = editingTemplate ? {
        templateId: editingTemplate._id,
        name: templateName,
        messageType,
        template: {
          ...(messageType === 'Buttons' && { header: header || undefined }),
          message: messageContent,
          ...(messageType === 'Buttons' && { footer: footer || undefined }),
          ...(messageType === 'Buttons' && {
            button: buttons
              .filter(btn => btn.name.trim() !== '')
              .map(btn => ({
                type: btn.type,
                title: btn.name,
                ...(btn.type === 'URL' && { url: btn.url }),
              })),
          }),
        },
      } : {
        name: templateName,
        messageType,
        template: {
          ...(messageType === 'Buttons' && { header: header || undefined }),
          message: messageContent,
          ...(messageType === 'Buttons' && { footer: footer || undefined }),
          ...(messageType === 'Buttons' && {
            button: buttons
              .filter(btn => btn.name.trim() !== '')
              .map(btn => ({
                type: btn.type,
                title: btn.name,
                ...(btn.type === 'URL' && { url: btn.url }),
              })),
          }),
        },
      };

      const endpoint = editingTemplate
        ? 'https://whatsapp.recuperafly.com/api/template/edit'
        : 'https://whatsapp.recuperafly.com/api/template/';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (data.status) {
        if (editingTemplate) {
          // Update existing template in the list
          setTemplates(prev => prev.map(t =>
            t._id === editingTemplate._id
              ? {
                ...t,
                name: templateName,
                messageType,
                template: {
                  ...payload.template,
                  button: payload.template.button?.map(btn => ({
                    name: btn.title, // Map `title` back to `name`
                    type: btn.type,
                    url: btn.url,
                    title: btn.title, // Optionally keep `title` if needed
                  })),
                },
              }
              : t
          ));
          showToast('Template updated successfully', 'success');
        } else {
          // Add new template or refresh the list
          await fetchTemplates(false);
          showToast('Template created successfully', 'success');
        }
        handleCloseModal();
      } else {
        showToast(data.message || 'Failed to save template', 'error');
      }
    } catch (err) {
      showToast('Error saving template: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    if (!token) {
      showToast('Please log in to delete template', 'error');
      router.push('/');
      return;
    }

    setIsDeleting(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/template/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId: id }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (data.status) {
        const updatedTotal = totalTemplates - 1;
        setTemplates(templates.filter(t => t._id !== id));
        setTotalTemplates(updatedTotal);

        const newTotalPages = Math.ceil(updatedTotal / templatesPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        } else if (newTotalPages === 0) {
          setCurrentPage(1);
        }

        showToast(data.message || 'Template deleted successfully', 'success');
      } else {
        showToast(data.message || 'Failed to delete template', 'error');
      }
    } catch (err) {
      showToast('Error deleting template: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handlePreview = (template: Template) => {
    let content = `Message:\n${template.template.message || 'N/A'}`;
    if (template.messageType === 'Buttons') {
      if (template.template.header) {
        content = `Header: ${template.template.header}\n${content}`;
      }
      if (template.template.footer) {
        content += `\nFooter: ${template.template.footer}`;
      }
    }
    setPreviewContent(content);
    setPreviewButtons(template.template.button || []);
    setIsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <TemplateHeader
          isLoading={isLoading}
          onCreateTemplate={() => handleOpenModal()}
        />

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-zinc-500 animate-spin mb-4" />
              <p className="text-zinc-400">Loading templates...</p>
            </div>
          </div>
        ) : (
          <TemplateTable
            templates={templates}
            isDeleting={isDeleting}
            currentPage={currentPage}
            totalPages={totalPages}
            templatesPerPage={templatesPerPage}
            totalTemplates={totalTemplates}
            onEdit={handleOpenModal}
            onDelete={handleDelete}
            onPreview={handlePreview}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            setCurrentPage={setCurrentPage}
          />
        )}

        {/* Preview Dialog */}
        <TemplatePreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          template={templates.find(t => previewContent.includes(t.template.message)) || null}
          previewContent={previewContent}
          previewButtons={previewButtons}
          showToast={showToast}
        />

        {/* Create/Edit Modal */}
        <TemplateFormDialog
          open={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          editingTemplate={editingTemplate}
          templateName={templateName}
          setTemplateName={setTemplateName}
          messageType={messageType}
          setMessageType={setMessageType}
          message={message}
          setMessage={setMessage}
          buttons={buttons}
          setButtons={setButtons}
          header={header}
          setHeader={setHeader}
          footer={footer}
          setFooter={setFooter}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}