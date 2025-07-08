"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import { message as antMessage } from 'antd';

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  antdContacts: any[];
  setAntdContacts: (contacts: any[]) => void;
  setRecipients: (recipients: any[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  setNumVariables: (num: number) => void;
}

interface ExcelRow {
  [key: string]: string;
}

export default function ExcelImportModal({
  open,
  onOpenChange,
  antdContacts,
  setAntdContacts,
  setRecipients,
  showToast,
  setNumVariables
}: ExcelImportModalProps) {
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [isExcelDataLoaded, setIsExcelDataLoaded] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: string }>({
    name: '',
    phone: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 12 fields per page
  const maxFields = 32; // Limit to 32 fields (name, phone, and up to 30 variables)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      showToast('Please upload a valid Excel or CSV file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer | string;
        let jsonData: string[][];
        
        if (file.name.endsWith('.csv')) {
          const text = data as string;
          const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
          jsonData = rows.filter(row => row.some(cell => cell));
        } else {
          const workbook = XLSX.read(data, { type: file.name.endsWith('.csv') ? 'string' : 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as string[][];
        }

        if (jsonData.length === 0) {
          showToast('The uploaded file is empty', 'error');
          return;
        }

        const headers = jsonData[0].map((header, idx) => header || `Column ${idx + 1}`);
        setExcelHeaders(headers);

        // Cap variables at 30 (so total fields <= 32 with name and phone)
        // Ensure at least 10 variables
        const maxVars = Math.min(Math.max(headers.length - 2, 10), 30);
        const initialMappings = {
          name: '',
          phone: '',
          ...Object.fromEntries(
            Array.from({ length: maxVars }, (_, idx) => [`var${idx + 1}`, ''])
          )
        };
        setColumnMappings(initialMappings);

        const rows = jsonData.slice(1).map((row) =>
          row.reduce((obj, value, idx) => {
            obj[headers[idx]] = value?.toString() || '';
            return obj;
          }, {} as ExcelRow)
        );

        setExcelData(rows);
        setIsExcelDataLoaded(true);
        setShowColumnMapping(true);
        setCurrentPage(1);

        // Update numVariables in parent component
        setNumVariables(maxVars);

        // Warn if columns were truncated
        if (headers.length - 2 > 30) {
          showToast(`Excel file has ${headers.length} columns, but only the first 30 variables (plus name and phone) can be mapped.`, 'warning');
        }
      } catch (err) {
        showToast('Error parsing file: The file may be corrupted or in an unsupported format.', 'error');
        console.error(err);
      }
    };

    reader.onerror = () => {
      showToast('Error reading the file', 'error');
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleColumnMappingChange = (field: string, header: string) => {
    setColumnMappings(prev => ({ ...prev, [field]: header === 'none' ? '' : header }));
  };

  // Auto mapping function
  const handleAutoMap = () => {
    const newMappings = { ...columnMappings };
    
    // Common patterns for name fields
    const namePatterns = [
      /^name$/i,
      /^full.?name$/i,
      /^customer.?name$/i,
      /^contact.?name$/i,
      /^person.?name$/i,
      /^user.?name$/i,
      /^client.?name$/i,
      /^first.?name$/i,
      /^naam$/i,
      /^नाम$/i
    ];

    // Common patterns for phone fields
    const phonePatterns = [
      /^phone$/i,
      /^mobile$/i,
      /^number$/i,
      /^phone.?number$/i,
      /^mobile.?number$/i,
      /^contact.?number$/i,
      /^whatsapp$/i,
      /^whatsapp.?number$/i,
      /^cell$/i,
      /^telephone$/i,
      /^tel$/i,
      /^mob$/i,
      /^फोन$/i,
      /^मोबाइल$/i
    ];

    // Auto-map name field
    for (const header of excelHeaders) {
      if (namePatterns.some(pattern => pattern.test(header))) {
        newMappings.name = header;
        break;
      }
    }

    // Auto-map phone field
    for (const header of excelHeaders) {
      if (phonePatterns.some(pattern => pattern.test(header))) {
        newMappings.phone = header;
        break;
      }
    }

    // Auto-map variable fields based on common patterns
    const variablePatterns = [
      /^var\d+$/i,
      /^variable\d+$/i,
      /^field\d+$/i,
      /^custom\d+$/i,
      /^data\d+$/i,
      /^value\d+$/i,
      /^param\d+$/i,
      /^attr\d+$/i,
      /^property\d+$/i,
      /^extra\d+$/i
    ];

    // Get remaining headers (not used for name/phone)
    const remainingHeaders = excelHeaders.filter(header => 
      header !== newMappings.name && header !== newMappings.phone
    );

    // Map variables in order
    let varIndex = 1;
    for (const header of remainingHeaders) {
      if (varIndex > 30) break; // Max 30 variables
      
      const varKey = `var${varIndex}`;
      if (varKey in newMappings) {
        // Check if it matches variable patterns or just assign in order
        const isVariablePattern = variablePatterns.some(pattern => pattern.test(header));
        if (isVariablePattern || !newMappings[varKey]) {
          newMappings[varKey] = header;
          varIndex++;
        }
      }
    }

    // If no specific variable patterns found, just map remaining headers in order
    if (varIndex === 1) {
      for (const header of remainingHeaders) {
        if (varIndex > 30) break;
        const varKey = `var${varIndex}`;
        if (varKey in newMappings && !newMappings[varKey]) {
          newMappings[varKey] = header;
          varIndex++;
        }
      }
    }

    setColumnMappings(newMappings);
    
    // Show success message with mapping summary
    const mappedCount = Object.values(newMappings).filter(value => value !== '').length;
    showToast(`Auto-mapped ${mappedCount} columns successfully!`, 'success');
  };

  const handleImportRecipients = () => {
    if (!columnMappings.name || !columnMappings.phone) {
      showToast('Please map both Name and Phone columns', 'error');
      return;
    }

    const numVars = Object.keys(columnMappings).filter(key => key.startsWith('var')).length;
    const newContacts = excelData.map((row, index) => {
      const contact: any = {
        key: (Date.now() + index).toString(),
        sn: antdContacts.length + index + 1,
        name: row[columnMappings.name] || '',
        number: row[columnMappings.phone] || '',
      };

      // Add variables dynamically
      Object.keys(columnMappings).forEach((key) => {
        if (key.startsWith('var') && columnMappings[key]) {
          contact[key] = row[columnMappings[key]] || '';
        }
      });

      return contact;
    }).filter(contact => contact.name && contact.number);

    const updatedContacts = [...antdContacts, ...newContacts];
    setAntdContacts(updatedContacts);
    
    // Update recipients state
    const updatedRecipients = updatedContacts.map(contact => ({
      phone: contact.number,
      name: contact.name,
      variables: Object.fromEntries(
        Array.from({ length: numVars }, (_, i) => [
          `var${i + 1}`,
          contact[`var${i + 1}`] || ''
        ])
      )
    }));
    setRecipients(updatedRecipients);
    
    // Reset modal state
    onOpenChange(false);
    setExcelData([]);
    setExcelHeaders([]);
    setIsExcelDataLoaded(false);
    setShowColumnMapping(false);
    setColumnMappings({ name: '', phone: '' });
    setCurrentPage(1);
    antMessage.success('Contacts imported successfully');
  };

  const handleClose = () => {
    onOpenChange(false);
    setExcelData([]);
    setExcelHeaders([]);
    setIsExcelDataLoaded(false);
    setShowColumnMapping(false);
    setColumnMappings({ name: '', phone: '' });
    setCurrentPage(1);
  };

  // Pagination logic for column mapping
  const allFields = ['name', 'phone', ...Object.keys(columnMappings).filter(field => field.startsWith('var'))];
  const totalPages = Math.ceil(allFields.length / itemsPerPage);
  // Ensure first page includes name, phone, and var1 to var10
  const paginatedFields = currentPage === 1
    ? allFields.slice(0, Math.min(itemsPerPage, allFields.length))
    : allFields.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Recipients</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Upload Excel or CSV file and map columns to import recipients
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {!isExcelDataLoaded ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg py-12">
              <Upload className="h-12 w-12 text-zinc-500 mb-4" />
              <Label className="text-zinc-400 mb-4">Upload .xlsx, .xls or .csv file</Label>
              <Button
                type="button"
                variant="outline"
                className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Select File
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : !showColumnMapping ? (
            <div className="space-y-4">
              <Label className="text-zinc-400 font-medium">Preview Data</Label>
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      {excelHeaders.map((header, idx) => (
                        <TableHead key={idx} className="text-zinc-400">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelData.slice(0, 5).map((row, rowIdx) => (
                      <TableRow key={rowIdx} className="border-zinc-800">
                        {excelHeaders.map((header, colIdx) => (
                          <TableCell key={colIdx} className="text-zinc-200">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowColumnMapping(true)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white"
                >
                  Map Columns
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 font-medium">Map Columns</Label>
                <Button
                  type="button"
                  onClick={handleAutoMap}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Auto Map
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedFields.map(field => (
                  <div key={field} className="space-y-2">
                    <Label className="text-zinc-400">
                      {field === 'name' ? 'Name *' : field === 'phone' ? 'Phone *' : `Variable ${field.slice(3)}`}
                    </Label>
                    <Select
                      value={columnMappings[field]}
                      onValueChange={(value) => handleColumnMappingChange(field, value)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                        <SelectValue placeholder={`Select column for ${field}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200">
                        <SelectItem value="none">None</SelectItem>
                        {excelHeaders.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-zinc-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowColumnMapping(false)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleImportRecipients}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white"
                  disabled={!columnMappings.name || !columnMappings.phone}
                >
                  Import
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}