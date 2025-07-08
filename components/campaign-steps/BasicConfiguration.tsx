"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, X, ChevronDown, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BasicConfigurationProps {
  campaignName: string;
  setCampaignName: (name: string) => void;
  selectedInstances: string[];
  setSelectedInstances: (instances: string[]) => void;
  instances: any[] | undefined; // Allow undefined
}

export default function BasicConfiguration({
  campaignName,
  setCampaignName,
  selectedInstances,
  setSelectedInstances,
  instances = [], // Default to empty array if undefined
}: BasicConfigurationProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogSearchTerm, setDialogSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogCurrentPage, setDialogCurrentPage] = useState(1);
  const [tempSelectedInstances, setTempSelectedInstances] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    console.log('Instances received:', instances);
    console.log('Connected instances:', instances?.filter(i => i?.whatsapp?.status?.toLowerCase() === 'connected') || []);
    console.log('selectedInstances.length:', selectedInstances.length);
    console.log('totalPages:', Math.ceil(selectedInstances.length / itemsPerPage));
  }, [instances, selectedInstances]);

  const connectedInstances = instances?.filter(i => i?.whatsapp?.status?.toLowerCase() === 'connected') || [];
  const isAllSelected = selectedInstances.length === connectedInstances.length && connectedInstances.length > 0;

  const handleInstanceSelection = (instanceId: string) => {
    setTempSelectedInstances(prev => 
      prev.includes(instanceId)
        ? prev.filter(id => id !== instanceId)
        : [...prev, instanceId]
    );
  };

  const handleSelectAll = () => {
    const connectedInstanceIds = connectedInstances.map(instance => instance._id);
    setSelectedInstances(connectedInstanceIds);
    setTempSelectedInstances(connectedInstanceIds);
  };

  const handleDeselectAll = () => {
    setSelectedInstances([]);
    setTempSelectedInstances([]);
  };

  // Dialog specific select/deselect all functions
  const handleDialogSelectAll = () => {
    const connectedInstanceIds = connectedInstances.map(instance => instance._id);
    setTempSelectedInstances(connectedInstanceIds);
  };

  const handleDialogDeselectAll = () => {
    setTempSelectedInstances([]);
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      setSearchTerm('');
      setDialogSearchTerm('');
      setDialogCurrentPage(1);
    }
  };

  const filteredInstances = connectedInstances.filter(instance => {
    const name = instance.name || `Device ${instance._id.slice(-4)}`;
    const phone = instance?.whatsapp?.phone || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           phone.includes(searchTerm);
  });

  const dialogFilteredInstances = connectedInstances.filter(instance => {
    const name = instance.name || `Device ${instance._id.slice(-4)}`;
    const phone = instance?.whatsapp?.phone || '';
    return name.toLowerCase().includes(dialogSearchTerm.toLowerCase()) || 
           phone.includes(dialogSearchTerm);
  });

  useEffect(() => {
    console.log('Filtered instances (dropdown):', filteredInstances);
    console.log('Filtered instances (dialog):', dialogFilteredInstances);
  }, [filteredInstances, dialogFilteredInstances]);

  const getDisplayText = () => {
    if (selectedInstances.length === 0) {
      return "Select instances";
    }
    if (selectedInstances.length === connectedInstances.length) {
      return `All instances selected (${selectedInstances.length})`;
    }
    if (selectedInstances.length <= 3) {
      return selectedInstances.map(id => {
        const instance = instances?.find(i => i._id === id);
        return instance?.name || `Device ${id.slice(-4)}`;
      }).join(", ");
    }
    return `${selectedInstances.length} instances selected`;
  };

  const totalPages = Math.ceil(selectedInstances.length / itemsPerPage);
  const paginatedInstances = selectedInstances
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    .map(id => instances?.find(i => i._id === id))
    .filter((instance): instance is NonNullable<typeof instance> => instance !== undefined);

  const dialogTotalPages = Math.ceil(dialogFilteredInstances.length / itemsPerPage);
  const dialogPaginatedInstances = dialogFilteredInstances
    .slice((dialogCurrentPage - 1) * itemsPerPage, dialogCurrentPage * itemsPerPage);

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

  const handleDialogNextPage = () => {
    if (dialogCurrentPage < dialogTotalPages) {
      setDialogCurrentPage(dialogCurrentPage + 1);
    }
  };

  const handleDialogPrevPage = () => {
    if (dialogCurrentPage > 1) {
      setDialogCurrentPage(dialogCurrentPage - 1);
    }
  };

  const handleDialogOpen = () => {
    setTempSelectedInstances([...selectedInstances]);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (confirm: boolean) => {
    if (confirm) {
      setSelectedInstances(tempSelectedInstances);
      // Close the dropdown when OK is clicked
      setIsDropdownOpen(false);
      setSearchTerm('');
    } else {
      setTempSelectedInstances([...selectedInstances]); // Reset to original selection
    }
    setDialogSearchTerm('');
    setDialogCurrentPage(1);
    setIsDialogOpen(false);
  };

  // Function to remove instance from selected list
  const handleRemoveInstance = (instanceId: string) => {
    const updatedSelection = selectedInstances.filter(id => id !== instanceId);
    setSelectedInstances(updatedSelection);
    setTempSelectedInstances(updatedSelection);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Basic Configuration</h3>
        <p className="text-zinc-400 mb-6">Enter the Campaign Name and Select Instance Details.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-400 font-medium">Campaign Name *</Label>
        <Input
          placeholder="Enter campaign name"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-200"
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-zinc-400 font-medium">Select Instances *</Label>
          <div className="flex gap-3">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              disabled={isAllSelected}
              className={`${
                isAllSelected 
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-500 cursor-not-allowed' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Select All
            </Button>
            <Button
              onClick={handleDeselectAll}
              variant="outline"
              size="sm"
              disabled={selectedInstances.length === 0}
              className={`${
                selectedInstances.length === 0
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-500 cursor-not-allowed'
                  : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
              }`}
            >
              <UserX className="h-4 w-4 mr-2" />
              Deselect All
            </Button>
          </div>
        </div>
        
        {connectedInstances.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-zinc-400">No connected instances available. Please connect at least one instance first.</p>
          </div>
        ) : (
          <>
            <div className="relative">
              <div
                onClick={handleDropdownToggle}
                className="flex items-center justify-between w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md cursor-pointer hover:border-zinc-600 transition-colors"
              >
                <span className="text-zinc-200 truncate">
                  {getDisplayText()}
                </span>
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-50 max-h-96 overflow-hidden">
                  <div className="p-3 border-b border-zinc-700">
                    <Input
                      placeholder="Search instances..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-zinc-900 border-zinc-600 text-zinc-200 h-8"
                    />
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {filteredInstances.length === 0 ? (
                      <div className="p-4 text-center text-zinc-400">
                        No instances found
                      </div>
                    ) : (
                      filteredInstances.slice(0, 10).map(instance => (
                        <div
                          key={instance._id}
                          onClick={() => {
                            handleInstanceSelection(instance._id);
                            setSelectedInstances(
                              tempSelectedInstances.includes(instance._id)
                                ? tempSelectedInstances.filter(id => id !== instance._id)
                                : [...tempSelectedInstances, instance._id]
                            );
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-zinc-700 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={tempSelectedInstances.includes(instance._id)}
                            onChange={() => {}}
                            className="w-5 h-5 border-zinc-200 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 hover:border-blue-400"
                          />
                          <div className="relative flex-shrink-0">
                            {instance?.whatsapp?.profile ? (
                              <img
                                src={instance.whatsapp.profile}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover border-2 border-zinc-600"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center border-2 border-zinc-600">
                                <span className="text-zinc-300 font-semibold text-sm">
                                  {(instance.name || `D${instance._id.slice(-2)}`).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-800 ${
                              instance?.whatsapp?.status?.toLowerCase() === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-200 font-medium truncate">
                                {instance.name || `Device ${instance._id.slice(-4)}`}
                              </span>
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                Connected
                              </Badge>
                            </div>
                            {instance?.whatsapp?.phone && (
                              <span className="text-zinc-400 text-sm">
                                {instance.whatsapp.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {filteredInstances.length > 10 && (
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full mt-2 text-zinc-200 bg-zinc-700 border-zinc-600 hover:bg-zinc-600 hover:text-zinc-200"
                            onClick={handleDialogOpen}
                          >
                            See More
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 w-[95vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[600px] lg:max-w-[800px] max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-zinc-200">All Instances</DialogTitle>
                          </DialogHeader>
                          
                          {/* Dialog Select/Deselect All Buttons */}
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex gap-3">
                              <Button
                                onClick={handleDialogSelectAll}
                                variant="outline"
                                size="sm"
                                disabled={tempSelectedInstances.length === connectedInstances.length}
                                className={`${
                                  tempSelectedInstances.length === connectedInstances.length
                                    ? 'bg-zinc-700 border-zinc-600 text-zinc-500 cursor-not-allowed' 
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Select All
                              </Button>
                              <Button
                                onClick={handleDialogDeselectAll}
                                variant="outline"
                                size="sm"
                                disabled={tempSelectedInstances.length === 0}
                                className={`${
                                  tempSelectedInstances.length === 0
                                    ? 'bg-zinc-700 border-zinc-600 text-zinc-500 cursor-not-allowed'
                                    : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                }`}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Deselect All
                              </Button>
                            </div>
                          </div>

                          <div className="p-3 border-b border-zinc-700">
                            <Input
                              placeholder="Search instances..."
                              value={dialogSearchTerm}
                              onChange={(e) => {
                                setDialogSearchTerm(e.target.value);
                                setDialogCurrentPage(1);
                              }}
                              className="bg-zinc-900 border-zinc-600 text-zinc-200 h-8"
                            />
                          </div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-zinc-700">
                                  <TableHead className="text-zinc-200 text-xs sm:text-sm">Name</TableHead>
                                  <TableHead className="text-zinc-200 text-xs sm:text-sm">Phone</TableHead>
                                  <TableHead className="text-zinc-200 text-xs sm:text-sm">Status</TableHead>
                                  <TableHead className="text-zinc-200 text-xs sm:text-sm">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dialogPaginatedInstances.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-zinc-400 text-center">
                                      No instances found
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  dialogPaginatedInstances.map(instance => (
                                    <TableRow key={instance._id} className="border-zinc-700">
                                      <TableCell className="text-zinc-200 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px]">
                                        {instance?.name || `Device ${instance._id.slice(-4)}`}
                                      </TableCell>
                                      <TableCell className="text-zinc-400 text-xs sm:text-sm">
                                        {instance?.whatsapp?.phone || '-'}
                                      </TableCell>
                                      <TableCell>
                                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                          Connected
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Checkbox
                                          checked={tempSelectedInstances.includes(instance._id)}
                                          onCheckedChange={() => handleInstanceSelection(instance._id)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-5 h-5 border-zinc-200 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 hover:border-blue-400"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          {dialogTotalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                              <span className="text-zinc-400 text-sm">
                                Showing {(dialogCurrentPage - 1) * itemsPerPage + 1}-{Math.min(dialogCurrentPage * itemsPerPage, dialogFilteredInstances.length)} of {dialogFilteredInstances.length} instances
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={handleDialogPrevPage}
                                  disabled={dialogCurrentPage === 1}
                                  className={`h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center p-0 ${
                                    dialogCurrentPage === 1
                                      ? 'text-zinc-500 cursor-not-allowed bg-zinc-800'
                                      : 'text-zinc-200 hover:text-zinc-200 hover:bg-zinc-600'
                                  }`}
                                  aria-label="Previous page"
                                >
                                  <ChevronLeft className="h-6 w-6" />
                                </Button>
                                {Array.from({ length: dialogTotalPages }, (_, i) => i + 1).map(page => (
                                  <Button
                                    key={page}
                                    onClick={() => setDialogCurrentPage(page)}
                                    className={`h-8 w-8 rounded-full transition-all duration-200 ${
                                      dialogCurrentPage === page
                                        ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600 hover:text-zinc-200'
                                        : 'bg-transparent hover:bg-zinc-600 text-zinc-200 hover:text-zinc-200'
                                    }`}
                                    aria-label={`Page ${page}`}
                                  >
                                    {page}
                                  </Button>
                                ))}
                                <Button
                                  onClick={handleDialogNextPage}
                                  disabled={dialogCurrentPage === dialogTotalPages}
                                  className={`h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center p-0 ${
                                    dialogCurrentPage === dialogTotalPages
                                      ? 'text-zinc-500 cursor-not-allowed bg-zinc-800'
                                      : 'text-zinc-200 hover:text-zinc-200 hover:bg-zinc-600'
                                  }`}
                                  aria-label="Next page"
                                >
                                  <ChevronRight className="h-6 w-6" />
                                </Button>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-end gap-3 mt-4">
                            <Button
                              variant="outline"
                              className="bg-zinc-700 border-zinc-600 text-zinc-200 hover:bg-zinc-600 hover:text-zinc-200"
                              onClick={() => handleDialogClose(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="bg-zinc-700 border-zinc-600 text-zinc-200 hover:bg-zinc-600 hover:text-zinc-200"
                              onClick={() => handleDialogClose(true)}
                            >
                              OK
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              )}

              {isDropdownOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}
            </div>

            {selectedInstances.length > 0 && (
              <div className="mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {selectedInstances.slice(0, 5).map(instanceId => {
                    const instance = instances?.find(i => i._id === instanceId);
                    return (
                      <Badge key={instanceId} variant="outline" className="text-zinc-200 bg-zinc-700/50">
                        {instance?.name || `Device ${instanceId.slice(-4)}`}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-4 w-4 p-0 hover:bg-red-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveInstance(instanceId);
                          }}
                        >
                          <X className="h-3 w-3 text-red-400" />
                        </Button>
                      </Badge>
                    );
                  })}
                  {selectedInstances.length > 5 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Badge variant="outline" className="text-zinc-400 bg-zinc-700/30 cursor-pointer">
                          +{selectedInstances.length - 5} more
                        </Badge>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-zinc-800 w-[95vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[600px] lg:max-w-[800px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-zinc-200">All Selected Instances</DialogTitle>
                        </DialogHeader>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-zinc-700">
                                <TableHead className="text-zinc-200 text-xs sm:text-sm">Name</TableHead>
                                <TableHead className="text-zinc-200 text-xs sm:text-sm">Phone</TableHead>
                                <TableHead className="text-zinc-200 text-xs sm:text-sm">Status</TableHead>
                                <TableHead className="text-zinc-200 text-xs sm:text-sm">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedInstances.map(instance => (
                                <TableRow key={instance._id} className="border-zinc-700">
                                  <TableCell className="text-zinc-200 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px]">
                                    {instance?.name || `Device ${instance._id.slice(-4)}`}
                                  </TableCell>
                                  <TableCell className="text-zinc-400 text-xs sm:text-sm">
                                    {instance?.whatsapp?.phone || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                      Connected
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 hover:bg-red-500/20"
                                      onClick={() => handleRemoveInstance(instance._id)}
                                    >
                                      <X className="h-4 w-4 text-red-400" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <span className="text-zinc-400 text-sm">
                              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, selectedInstances.length)} of {selectedInstances.length} instances
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className={`h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center p-0 ${
                                  currentPage === 1
                                    ? 'text-zinc-500 cursor-not-allowed bg-zinc-800'
                                    : 'text-zinc-200 hover:text-zinc-200 hover:bg-zinc-600'
                                }`}
                                aria-label="Previous page"
                              >
                                <ChevronLeft className="h-6 w-6" />
                              </Button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <Button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`h-8 w-8 rounded-full transition-all duration-200 ${
                                    currentPage === page
                                      ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600 hover:text-zinc-200'
                                      : 'bg-transparent hover:bg-zinc-600 text-zinc-200 hover:text-zinc-200'
                                  }`}
                                  aria-label={`Page ${page}`}
                                >
                                  {page}
                                </Button>
                              ))}
                              <Button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className={`h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center p-0 ${
                                  currentPage === totalPages
                                    ? 'text-zinc-500 cursor-not-allowed bg-zinc-800'
                                    : 'text-zinc-200 hover:text-zinc-200 hover:bg-zinc-600'
                                }`}
                                aria-label="Next page"
                              >
                                <ChevronRight className="h-6 w-6" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}