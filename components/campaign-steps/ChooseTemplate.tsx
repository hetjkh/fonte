"use client";

import { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

interface ChooseTemplateProps {
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  templates: any[];
}

export default function ChooseTemplate({
  selectedTemplate,
  setSelectedTemplate,
  templates: initialTemplates
}: ChooseTemplateProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [templateSearchValue, setTemplateSearchValue] = useState('');
  const [templateCurrentPage, setTemplateCurrentPage] = useState(1);
  const [templatesPerPage] = useState(5);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const router = useRouter();

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
    Cookies.remove('token', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    localStorage.removeItem('token');
    Cookies.remove('user', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    localStorage.removeItem('user');
    router.push('/');
  };

  const fetchTemplates = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/template/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          page: templateCurrentPage, 
          limit: templatesPerPage,
          search: templateSearchValue 
        }),
      });
      
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const templateData = await response.json();
      if (templateData.status) {
        setTemplates(templateData.templates || []);
        setTotalTemplates(templateData.total || 0);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, [router, templateCurrentPage, templateSearchValue]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const totalTemplatePages = Math.ceil(totalTemplates / templatesPerPage);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Choose Template</h3>
        <p className="text-zinc-400 mb-6">Choose from a list of pre-approved templates or create a new template to make your campaigns live on the go.</p>
      </div>

      {/* Search and Create Template */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search templates..."
              value={templateSearchValue}
              onChange={(e) => setTemplateSearchValue(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
          onClick={() => router.push('/templates')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create A New Template
        </Button>
      </div>

      {/* Templates Table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead className="text-zinc-400">SN</TableHead>
              <TableHead className="text-zinc-400">Template</TableHead>
              <TableHead className="text-zinc-400">Template Type</TableHead>
              <TableHead className="text-zinc-400">Created At</TableHead>
              <TableHead className="text-zinc-400">Select</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template, index) => (
              <TableRow key={template._id} className="border-zinc-800">
                <TableCell className="text-zinc-200">
                  {(templateCurrentPage - 1) * templatesPerPage + index + 1}
                </TableCell>
                <TableCell className="text-zinc-200">{template.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-zinc-300">
                    {template.messageType}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-400">
                  {new Date().toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={selectedTemplate === template._id}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTemplate(template._id!);
                      } else {
                        setSelectedTemplate('');
                      }
                    }}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Template Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={templateCurrentPage === 1}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-zinc-400 text-sm">
            {templateCurrentPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateCurrentPage(prev => Math.min(prev + 1, totalTemplatePages))}
            disabled={templateCurrentPage === totalTemplatePages}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}