"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Users, Trash2, Plus, FileText, Eraser, Download, Settings } from 'lucide-react';
import { ConfigProvider, Table as AntTable, Button as AntButton, Form, message as antMessage } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import ExcelImportModal from '../ExcelImportModal';
import * as XLSX from 'xlsx';

interface SelectAudienceProps {
  antdContacts: any[];
  setAntdContacts: (contacts: any[]) => void;
  recipients: any[];
  setRecipients: (recipients: any[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function SelectAudience({
  antdContacts,
  setAntdContacts,
  recipients,
  setRecipients,
  showToast
}: SelectAudienceProps) {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVariableDialogOpen, setIsVariableDialogOpen] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [deleteContactKey, setDeleteContactKey] = useState<string | null>(null);
  const [contactForm] = Form.useForm();
  const [variableForm] = Form.useForm();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ key: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [numVariables, setNumVariables] = useState(10); // Default to 10 variables

  // Handle inline editing for any field
  const handleSaveField = (key: string, field: string, newValue: string) => {
    const updatedContacts = antdContacts.map(contact =>
      contact.key === key ? { ...contact, [field]: newValue } : contact
    );
    setAntdContacts(updatedContacts);

    const updatedRecipients = updatedContacts.map(contact => ({
      phone: contact.number,
      name: contact.name,
      variables: Object.fromEntries(
        Array.from({ length: numVariables }, (_, i) => [
          `var${i + 1}`,
          contact[`var${i + 1}`] || ''
        ])
      )
    }));
    setRecipients(updatedRecipients);
    antMessage.success(`${field === 'name' ? 'Name' : field === 'number' ? 'Number' : field.toUpperCase()} updated successfully`);
  };

  // Start editing a cell
  const startEditing = (record: any, field: string) => {
    setEditingCell({ key: record.key, field });
    setEditValue(record[field] || '');
  };

  // Save the edited value
  const saveEdit = () => {
    if (editingCell) {
      handleSaveField(editingCell.key, editingCell.field, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Generic function to create editable cell
  const createEditableCell = (field: string, placeholder: string) => {
    return {
      render: (text: string, record: any) => {
        const isEditing = editingCell?.key === record.key && editingCell?.field === field;

        if (isEditing) {
          return (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveEdit();
                }
                if (e.key === 'Escape') {
                  cancelEdit();
                }
              }}
              placeholder={placeholder}
              autoFocus
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          );
        }

        return (
          <div
            onClick={() => startEditing(record, field)}
            className="cursor-pointer hover:bg-zinc-700/30 px-2 py-1 rounded transition-colors min-h-[32px] flex items-center"
            title="Click to edit"
          >
            {text || <span className="text-zinc-500 italic">{placeholder}</span>}
          </div>
        );
      },
    };
  };

  // Ant Design Table Columns
  const antdColumns = [
    {
      title: 'SN',
      dataIndex: 'sn',
      key: 'sn',
      width: 60,
      align: 'center' as const,
      fixed: 'left' as const,
      render: (text: any, record: any, index: number) => index + 1,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left' as const,
      ...createEditableCell('name', 'Enter name'),
    },
    {
      title: 'Number',
      dataIndex: 'number',
      key: 'number',
      width: 150,
      fixed: 'left' as const,
      ...createEditableCell('number', 'Enter phone number'),
    },
    ...Array.from({ length: numVariables }, (_, index) => ({
      title: `Variable ${index + 1}`,
      dataIndex: `var${index + 1}`,
      key: `var${index + 1}`,
      width: 120,
      ...createEditableCell(`var${index + 1}`, `Enter variable ${index + 1}`),
    })),
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <AntButton
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
            style={{ color: '#ef4444' }}
            onClick={() => {
              setDeleteContactKey(record.key);
              setIsDeleteDialogOpen(true);
            }}
          >
            Delete
          </AntButton>
        </div>
      ),
    },
    {
      title: 'Setting',
      width: 70,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <AntButton
            type="link"
            icon={<Settings />}
            size="small"
            style={{ color: '#3b82f6' }}
            onClick={() => setIsVariableDialogOpen(true)}
          >
          </AntButton>
        </div>
      ),
    }
  ];

  // Handle downloading sample Excel file
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        name: 'John Doe',
        number: '+12025550123',
        ...Object.fromEntries(
          Array.from({ length: numVariables }, (_, i) => [
            `var${i + 1}`,
            `Sample${i + 1}`
          ])
        )
      },
      {
        name: 'Jane Smith',
        number: '+919876543210',
        ...Object.fromEntries(
          Array.from({ length: numVariables }, (_, i) => [
            `var${i + 1}`,
            `Sample${i + 1}`
          ])
        )
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      ...Array.from({ length: numVariables }, () => ({ wch: 15 })),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'Sample_Contacts.xlsx');
    antMessage.success('Sample Excel file downloaded successfully');
    setIsDownloadDialogOpen(false);
  };

  // Handle downloading sample CSV file
  const handleDownloadSampleCSV = () => {
    const headers = ['name', 'number', ...Array.from({ length: numVariables }, (_, i) => `var${i + 1}`)];
    const sampleData = [
      [
        'John Doe',
        '+12025550123',
        ...Array.from({ length: numVariables }, (_, i) => `Sample${i + 1}`),
      ],
      [
        'Jane Smith',
        '+919876543210',
        ...Array.from({ length: numVariables }, (_, i) => `Sample${i + 1}`),
      ],
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(',')),
    ].join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Sample_Contacts.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    antMessage.success('Sample CSV file downloaded successfully');
    setIsDownloadDialogOpen(false);
  };

  const handleContactAdd = () => {
    contactForm.resetFields();
    contactForm.setFieldsValue({ numVariables: numVariables });
    setIsContactDialogOpen(true);
  };

  const handleContactDelete = (key: string) => {
    setAntdContacts(antdContacts.filter(contact => contact.key !== key));
    antMessage.success('Contact deleted successfully');

    const updatedRecipients = antdContacts
      .filter(contact => contact.key !== key)
      .map(contact => ({
        phone: contact.number,
        name: contact.name,
        variables: Object.fromEntries(
          Array.from({ length: numVariables }, (_, i) => [
            `var${i + 1}`,
            contact[`var${i + 1}`] || ''
          ])
        )
      }));
    setRecipients(updatedRecipients);
  };

  const handleConfirmDelete = () => {
    if (deleteContactKey) {
      handleContactDelete(deleteContactKey);
      setIsDeleteDialogOpen(false);
      setDeleteContactKey(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeleteContactKey(null);
  };

  const handleContactSubmit = async () => {
    try {
      const values = await contactForm.validateFields();
      const newContact = {
        ...values,
        key: Date.now().toString(),
        sn: antdContacts.length + 1,
      };
      const updatedContacts = [...antdContacts, newContact];
      setAntdContacts(updatedContacts);
      antMessage.success('Contact added successfully');

      const updatedRecipients = updatedContacts.map(contact => ({
        phone: contact.number,
        name: contact.name,
        variables: Object.fromEntries(
          Array.from({ length: numVariables }, (_, i) => [
            `var${i + 1}`,
            contact[`var${i + 1}`] || ''
          ])
        )
      }));
      setRecipients(updatedRecipients);

      setIsContactDialogOpen(false);
      contactForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleContactCancel = () => {
    setIsContactDialogOpen(false);
    contactForm.resetFields();
  };

  const handleVariableSubmit = async () => {
    try {
      const values = await variableForm.validateFields();
      const newNumVariables = parseInt(values.numVariables, 10);
      if (newNumVariables < 10 || newNumVariables > 30) {
        antMessage.error('Number of variables must be between 10 and 30');
        return;
      }
      setNumVariables(newNumVariables);
      antMessage.success(`Set to ${newNumVariables} variables`);
      setIsVariableDialogOpen(false);
      variableForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleVariableCancel = () => {
    setIsVariableDialogOpen(false);
    variableForm.resetFields();
  };

  const handleRemoveDuplicates = () => {
    const seenPhones = new Set<string>();
    const uniqueContacts = antdContacts.filter((contact) => {
      if (!contact.number) return false;
      if (seenPhones.has(contact.number)) return false;
      seenPhones.add(contact.number);
      return true;
    });

    if (uniqueContacts.length === antdContacts.length) {
      antMessage.info('No duplicate phone numbers found.');
    } else {
      setAntdContacts(uniqueContacts);
      antMessage.success(`Removed ${antdContacts.length - uniqueContacts.length} duplicate contacts.`);

      const updatedRecipients = uniqueContacts.map(contact => ({
        phone: contact.number,
        name: contact.name,
        variables: Object.fromEntries(
          Array.from({ length: numVariables }, (_, i) => [
            `var${i + 1}`,
            contact[`var${i + 1}`] || ''
          ])
        )
      }));
      setRecipients(updatedRecipients);
    }
  };

  const handleCleanNumbers = () => {
    let cleanedCount = 0;
    const cleanedContacts = antdContacts.map(contact => {
      if (contact.number && contact.number.includes(' ')) {
        cleanedCount++;
        return {
          ...contact,
          number: contact.number.replace(/\s+/g, '')
        };
      }
      return contact;
    });

    if (cleanedCount === 0) {
      antMessage.info('No phone numbers with spaces found.');
    } else {
      setAntdContacts(cleanedContacts);
      antMessage.success(`Cleaned ${cleanedCount} phone numbers by removing spaces.`);

      const updatedRecipients = cleanedContacts.map(contact => ({
        phone: contact.number,
        name: contact.name,
        variables: Object.fromEntries(
          Array.from({ length: numVariables }, (_, i) => [
            `var${i + 1}`,
            contact[`var${i + 1}`] || ''
          ])
        )
      }));
      setRecipients(updatedRecipients);
    }
  };

  const handleDeleteAll = () => {
    setAntdContacts([]);
    setRecipients([{
      phone: '',
      name: '',
      variables: Object.fromEntries(
        Array.from({ length: numVariables }, (_, i) => [
          `var${i + 1}`,
          ''
        ])
      )
    }]);
    antMessage.success('All contacts deleted.');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#3b82f6',
          colorBgContainer: '#27272a',
          colorBorder: '#3f3f46',
          colorText: '#e4e4e7',
          colorTextSecondary: '#a1a1aa',
          colorBgElevated: '#18181b',
        },
        components: {
          Table: {
            headerBg: '#18181b',
            headerColor: '#a1a1aa',
            rowHoverBg: '#3f3f46',
            borderColor: '#3f3f46',
          },
        },
      }}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-200 mb-2">Select Audience</h3>
          <p className="text-zinc-400 mb-6">Import recipients from Excel, download a sample file, or add manually. Click any cell to edit.</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-400 font-medium mb-1">Editing Instructions</h4>
              <ul className="text-blue-300 text-sm space-y-1">
                <li>• Click any cell (Name, Number, or Variables) to edit</li>
                <li>• Download the sample file for the correct import format</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Excel Import
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsDownloadDialogOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Sample File
          </Button>
          <Button
            variant="outline"
            onClick={handleRemoveDuplicates}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <Users className="h-4 w-4 mr-2" />
            Remove Duplicates
          </Button>
          <Button
            variant="outline"
            onClick={handleCleanNumbers}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Clean Numbers
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
          <Button
            variant="outline"
            onClick={handleContactAdd}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 table-container">
          <AntTable
            columns={antdColumns}
            dataSource={antdContacts}
            scroll={{ x: 960 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              // showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
              style: {
                color: '#e4e4e7',
              }
            }}
            bordered
            size="middle"
            style={{
              backgroundColor: '#27272a'
            }}
            className="custom-table"
            rowKey="key"
          />
        </div>

        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Total: {antdContacts.length}</span>
            <span className="text-zinc-400">Valid: {antdContacts.filter(c => c.name && c.number).length}</span>
            <span className="text-zinc-400">Invalid: {antdContacts.filter(c => !c.name || !c.number).length}</span>
          </div>
        </div>

        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogContent className="bg-zinc-800 text-zinc-200 border-zinc-700 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Add New Contact</DialogTitle>
            </DialogHeader>
            <Form
              form={contactForm}
              layout="vertical"
              requiredMark={false}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  label={<span className="text-zinc-400">Name</span>}
                  name="name"
                  rules={[{ required: true, message: 'Please enter name' }]}
                >
                  <Input
                    placeholder="Enter name"
                    autoFocus
                    className="bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-blue-500"
                  />
                </Form.Item>
                <Form.Item
                  label={<span className="text-zinc-400">Phone Number</span>}
                  name="number"
                  rules={[{ required: true, message: 'Please enter number' }]}
                >
                  <Input
                    placeholder="Enter phone number (e.g., +12025550123)"
                    className="bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-blue-500"
                  />
                </Form.Item>
              </div>

              <Form.Item
                label={<span className="text-zinc-400">Number of Variables</span>}
                name="numVariables"
                initialValue={numVariables}
                rules={[
                  { required: true, message: 'Please enter number of variables' },
                  {
                    validator: (_, value) => {
                      const num = parseInt(value, 10);
                      if (isNaN(num) || num < 10 || num > 30) {
                        return Promise.reject('Number of variables must be between 10 and 30');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input
                  type="number"
                  placeholder="Enter number of variables (1-30)"
                  className="bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-blue-500"
                  onChange={(e) => setNumVariables(parseInt(e.target.value) || 10)}
                />
              </Form.Item>

              <div className="border-t border-zinc-700 pt-4 mt-4">
                <h4 className="text-zinc-200 mb-4">Custom Variables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: numVariables }, (_, index) => (
                    <Form.Item
                      key={index}
                      label={<span className="text-zinc-400">Variable {index + 1}</span>}
                      name={`var${index + 1}`}
                    >
                      <Input
                        placeholder={`Enter variable ${index + 1}`}
                        className="bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-blue-500"
                      />
                    </Form.Item>
                  ))}
                </div>
              </div>
            </Form>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleContactCancel}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleContactSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-zinc-800 text-zinc-200 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Confirm Delete</DialogTitle>
            </DialogHeader>
            <p className="text-center text-zinc-400">Are you sure you want to delete this contact?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                No
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isVariableDialogOpen} onOpenChange={setIsVariableDialogOpen}>
          <DialogContent className="bg-zinc-800 text-zinc-200 border-zinc-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Set Number of Variables</DialogTitle>
            </DialogHeader>
            <Form
              form={variableForm}
              layout="vertical"
              requiredMark={false}
              className="space-y-4"
            >
              <Form.Item
                label={<span className="text-zinc-400">Number of Variables (10-30)</span>}
                name="numVariables"
                initialValue={numVariables}
                rules={[
                  { required: true, message: 'Please enter number of variables' },
                  {
                    validator: (_, value) => {
                      const num = parseInt(value, 10);
                      if (isNaN(num) || num < 10 || num > 30) {
                        return Promise.reject('Number of variables must be between 10 and 30');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input
                  type="number"
                  placeholder="Enter number of variables (10-30)"
                  className="bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-blue-500"
                />
              </Form.Item>
            </Form>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleVariableCancel}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVariableSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Set
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
          <DialogContent className="bg-zinc-800 text-zinc-200 border-zinc-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Download Sample File</DialogTitle>
            </DialogHeader>
            <p className="text-center text-zinc-400">What type of sample file would you like to download?</p>
            <DialogFooter className="flex justify-center gap-3">
              <Button
                onClick={handleDownloadSampleExcel}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Excel (XLSX)
              </Button>
              <Button
                onClick={handleDownloadSampleCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                CSV
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ExcelImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          antdContacts={antdContacts}
          setAntdContacts={setAntdContacts}
          setRecipients={setRecipients}
          showToast={showToast}
          setNumVariables={setNumVariables} // Pass setNumVariables
        />
      </div>

      <style jsx global>{`
        .table-container {
          width: 1090px;
          overflow-x: auto;
        }

        .custom-table .ant-table-thead > tr > th {
          background-color: #18181b !important;
          color: #a1a1aa !important;
          border-bottom: 1px solid #3f3f46 !important;
        }
        
        .custom-table .ant-table-tbody > tr > td {
          background-color: #27272a !important;
          color: #e4e4e7 !important;
          border-bottom: 1px solid #3f3f46 !important;
        }
        
        .custom-table .ant-table-tbody > tr:hover > td {
          background-color: #3f3f46 !important;
        }
        
        .custom-table .ant-table-container {
          border: 1px solid #3f3f46 !important;
        }
        
        .custom-table .ant-pagination {
          color: #e4e4e7 !important;
        }
        
        .custom-table .ant-pagination .ant-pagination-item {
          background-color: #18181b !important;
          border-color: #3f3f46 !important;
          margin: 0 4px !important;
        }
        
        .custom-table .ant-pagination .ant-pagination-item a {
          color: #e4e4e7 !important;
        }
        
        .custom-table .ant-pagination .ant-pagination-item-active {
          background-color: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }
        
        .custom-table .ant-pagination .ant-pagination-item-active a {
          color: white !important;
        }

        .custom-table .ant-table-body::-webkit-scrollbar {
          height: 8px;
        }
        
        .custom-table .ant-table-body::-webkit-scrollbar-track {
          background: #3f3f46;
        }
        
        .custom-table .ant-table-body::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        .custom-table .ant-table-body::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: #3f3f46;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </ConfigProvider>
  );
}