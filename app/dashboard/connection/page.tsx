"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from "../../../hooks/useSocket";
import {
  Phone, 
  QrCode, 
  Edit, 
  Trash2, 
  LogOut, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
} from 'lucide-react';

interface WhatsAppProfile {
  phone?: string | null;
  status: string;
  profile?: string | null;
}

interface Instance {
  _id: string;
  name?: string;
  whatsapp: WhatsAppProfile;
  createdAt: string;
}

interface QREvent {
  instanceId: string;
  qr: string;
}

interface InstanceUpdateEvent {
  instanceId: string;
  _id: string;
  userId: string;
  token: string;
  name: string;
  whatsapp: {
    status: string;
    name: string;
    phone: string;
    bio: string;
    profile: string | null;
    disconnectReason: number;
    qr: string;
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

export default function DevicesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [connectedInstance, setConnectedInstance] = useState<Instance | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [instancesPerPage, setInstancesPerPage] = useState(10); // Default to 10, now user-selectable
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null);
  const [editInstanceName, setEditInstanceName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState<{ [key: string]: boolean }>({});
  const [isProcessingLogout, setIsProcessingLogout] = useState<{ [key: string]: boolean }>({});
  const [isProcessingDelete, setIsProcessingDelete] = useState<{ [key: string]: boolean }>({});
  const [isProcessingEdit, setIsProcessingEdit] = useState<{ [key: string]: boolean }>({});
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Get token from cookies/localStorage
  const getToken = (): string | null => {
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
    
    if (cookieToken) {
      return cookieToken;
    }
    
    const localToken = localStorage.getItem('token');
    if (localToken) {
      return localToken;
    }

    return null;
  };

  // Initialize token
  useEffect(() => {
    const authToken = getToken();
    setToken(authToken);
  }, []);

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

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-900/90 border-emerald-700 text-emerald-100';
      case 'error':
        return 'bg-red-900/90 border-red-700 text-red-100';
      case 'warning':
        return 'bg-amber-900/90 border-amber-700 text-amber-100';
      case 'info':
        return 'bg-blue-900/90 border-blue-700 text-blue-100';
      default:
        return 'bg-zinc-900/90 border-zinc-700 text-zinc-100';
    }
  };

  // Socket connection
  const { emit, on, off, isConnected } = useSocket({
    token,
    onConnect: () => {},
    onDisconnect: () => {},
    onError: (error) => {
      if (error.message.includes('Authentication failed') || error.message.includes('Not authorized')) {
        showToast('Authentication failed. Please log in again.', 'error');
        handleUnauthorized();
      }
    }
  });

  // Socket event listeners
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const handleQREvent = (data: QREvent) => {
      if (data.instanceId === selectedInstanceId) {
        setQrCode(data.qr);
        setIsProcessingQR(prev => ({ ...prev, [data.instanceId]: false }));
        showToast('QR code received', 'success');
      }
    };

    const handleInstanceUpdate = (data: InstanceUpdateEvent) => {
      setInstances(prev => 
        prev.map(instance => 
          instance._id === data.instanceId 
            ? {
                ...instance,
                name: data.name,
                whatsapp: {
                  phone: data.whatsapp.phone,
                  status: data.whatsapp.status,
                  profile: data.whatsapp.profile
                },
                createdAt: data.createdAt
              }
            : instance
        )
      );

      if (data.whatsapp.status === 'connected' && data.instanceId === selectedInstanceId && showQR) {
        setShowQR(false);
        setConnectedInstance({
          _id: data._id,
          name: data.name,
          whatsapp: {
            phone: data.whatsapp.phone,
            status: data.whatsapp.status,
            profile: data.whatsapp.profile
          },
          createdAt: data.createdAt
        });
        setShowSuccessDialog(true);
        setSelectedInstanceId(null);
        showToast('WhatsApp connected successfully!', 'success');
      }
    };

    on('instance.qr', handleQREvent);
    on('instance.update', handleInstanceUpdate);

    return () => {
      off('instance.qr', handleQREvent);
      off('instance.update', handleInstanceUpdate);
    };
  }, [isConnected, selectedInstanceId, showQR, on, off]);

  const handleUnauthorized = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('token');
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const fetchInstances = useCallback(async () => {
    const authToken = getToken();
    if (!authToken) {
      showToast('Please log in to access your devices', 'error');
      window.location.href = '/';
      return;
    }

    setIsLoading(true);
    try {
      let allInstances: Instance[] = [];
      let page = 0;
      const limit = 10;

      while (true) {
        const response = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page, limit }),
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const data = await response.json();
        if (data.status) {
          const fetchedInstances = data.instances || [];
          allInstances = [...allInstances, ...fetchedInstances];
          if (fetchedInstances.length < limit || allInstances.length >= data.total) {
            break;
          }
          page++;
        } else {
          showToast(data.message || 'Failed to fetch instances', 'error');
          break;
        }
      }

      setInstances(allInstances);
    } catch (err) {
      showToast('Error fetching instances: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchInstances();
    }
  }, [token, fetchInstances]);

  const handleCreateInstance = async () => {
    const authToken = getToken();
    if (!authToken) {
      showToast('Please log in to create an instance', 'error');
      window.location.href = '/';
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.status) {
        const newInstance = data.instance;
        setInstances((prev) => [...prev, newInstance]);
        showToast('Instance created successfully', 'success');
        // Show the page with the new instance
        const totalPages = Math.ceil((instances.length + 1) / instancesPerPage);
        setCurrentPage(totalPages);
      } else {
        showToast(data.message || 'Failed to create instance', 'error');
      }
    } catch (err) {
      showToast('Error creating instance: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowQR = async (instanceId: string) => {
    const authToken = getToken();
    if (!authToken) {
      showToast('Please log in to view QR code', 'error');
      window.location.href = '/';
      return;
    }

    if (!isConnected) {
      showToast('Socket not connected. Please wait for connection.', 'warning');
      return;
    }

    setIsProcessingQR(prev => ({ ...prev, [instanceId]: true }));
    setSelectedInstanceId(instanceId);
    setQrCode('');
    setShowQR(true);

    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/qr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instance_id: instanceId }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (!data.status) {
        showToast(data.message || 'Failed to request QR code', 'error');
        setShowQR(false);
        setSelectedInstanceId(null);
        setIsProcessingQR(prev => ({ ...prev, [instanceId]: false }));
      } else {
        showToast('QR code requested, waiting for response...', 'info');
      }
    } catch (err) {
      showToast('Error requesting QR code: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
      setShowQR(false);
      setSelectedInstanceId(null);
      setIsProcessingQR(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  const handleDeleteInstance = async (instanceId: string) => {
    const authToken = getToken();
    if (!authToken) {
      showToast('Please log in to delete instance', 'error');
      window.location.href = '/';
      return;
    }

    setIsProcessingDelete(prev => ({ ...prev, [instanceId]: true }));
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceId }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.status) {
        setInstances((prev) => {
          const newInstances = prev.filter((instance) => instance._id !== instanceId);
          const totalPages = Math.ceil(newInstances.length / instancesPerPage);
          if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
          }
          return newInstances;
        });
        showToast(data.message || 'Instance deleted successfully', 'success');
      } else {
        showToast(data.message || 'Failed to delete instance', 'error');
      }
    } catch (err) {
      showToast('Error deleting instance: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsProcessingDelete(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  const handleLogoutInstance = async (instanceId: string) => {
    const authToken = getToken();
    if (!authToken) {
      showToast('Please log in to log out instance', 'error');
      window.location.href = '/';
      return;
    }

    setIsProcessingLogout(prev => ({ ...prev, [instanceId]: true }));
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceId }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.status) {
        setInstances((prev) =>
          prev.map((instance) =>
            instance._id === instanceId
              ? { 
                  ...instance, 
                  whatsapp: { 
                    ...instance.whatsapp, 
                    status: 'disconnected',
                    phone: null,
                    profile: null
                  } 
                }
              : instance
          )
        );
        showToast(data.message || 'Logged out successfully', 'success');
      } else {
        showToast(data.message || 'Failed to log out', 'error');
      }
    } catch (err) {
      showToast('Error logging out: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsProcessingLogout(prev => ({ ...prev, [instanceId]: false }));
    }
  };

  const handleEditInstance = async () => {
    const authToken = getToken();
    if (!authToken) {
      showToast('Please log in to edit instance', 'error');
      window.location.href = '/';
      return;
    }

    if (!editInstanceName.trim()) {
      showToast('Please enter a valid name', 'warning');
      return;
    }

    setIsProcessingEdit(prev => ({ ...prev, [editInstanceId!]: true }));
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/edit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId: editInstanceId,
          name: editInstanceName,
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.status) {
        setInstances((prev) =>
          prev.map((instance) =>
            instance._id === editInstanceId
              ? { ...instance, name: editInstanceName }
              : instance
          )
        );
        showToast(data.message || 'Instance name updated successfully', 'success');
        setShowEditDialog(false);
        setEditInstanceId(null);
        setEditInstanceName('');
        setSelectedInstance(null);
      } else {
        showToast(data.message || 'Failed to update instance name', 'error');
      }
    } catch (err) {
      showToast('Error updating instance name: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsProcessingEdit(prev => ({ ...prev, [editInstanceId!]: false }));
    }
  };

  const openEditDialog = (instanceId: string, currentName: string | undefined) => {
    const instance = instances.find(inst => inst._id === instanceId);
    setEditInstanceId(instanceId);
    setEditInstanceName(currentName || '');
    setSelectedInstance(instance || null);
    setShowEditDialog(true);
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(instances.length / instancesPerPage);
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'disconnected':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20';
    }
  };

  // Sort instances from old to new
  const sortedInstances = [...instances].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateA - dateB;
  });

  const indexOfLastInstance = currentPage * instancesPerPage;
  const indexOfFirstInstance = indexOfLastInstance - instancesPerPage;
  const currentInstances = sortedInstances.slice(indexOfFirstInstance, indexOfLastInstance);
  const totalPages = Math.ceil(sortedInstances.length / instancesPerPage);

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg transform transition-all duration-300 ease-in-out ${getToastStyles(toast.type)}`}
          >
            <div className="flex-shrink-0">
              {getToastIcon(toast.type)}
            </div>
            <div className="flex-1 text-sm font-medium">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              WhatsApp Devices
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4" />
                  <span className="hidden sm:inline">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Disconnected</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 py-2 h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              onClick={handleCreateInstance}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Create Instance
                </>
              )}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-zinc-500 animate-spin mb-4" />
              <p className="text-zinc-400">Loading instances...</p>
            </div>
          </div>
        ) : sortedInstances.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-zinc-800 rounded-xl bg-zinc-900/50">
            <div className="text-center p-8">
              <Phone className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">No Devices Found</h3>
              <p className="text-zinc-500 mb-6 max-w-md">You don't have any WhatsApp instances yet. Create your first instance to get started.</p>
              <button
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 h-12 rounded-xl transition-all duration-300 flex items-center gap-2 mx-auto"
                onClick={handleCreateInstance}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Create First Instance
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {currentInstances.map((instance, index) => (
              <div 
                key={instance._id} 
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all duration-300"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {instance.whatsapp.profile ? (
                      <div className="relative">
                        <img
                          src={instance.whatsapp.profile}
                          alt="Profile"
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-zinc-700"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-zinc-900 ${
                          instance.whatsapp.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                          <span className="text-zinc-300 font-semibold text-sm sm:text-base">
                            {indexOfFirstInstance + index + 1}
                          </span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-zinc-900 ${
                          instance.whatsapp.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-zinc-200 font-medium text-sm sm:text-base truncate">
                        {instance.whatsapp.phone || `WhatsApp Device ${indexOfFirstInstance + index + 1}`}
                      </span>
                      {instance.name && (
                        <span className="text-xs sm:text-sm text-zinc-400 mt-0.5 truncate">
                          {instance.name}
                        </span>
                      )}
                      <div className="flex items-center mt-2">
                        <span
                          className={`text-xs px-2 sm:px-3 py-1 rounded-full ${getStatusClass(instance.whatsapp.status)}`}
                        >
                          {instance.whatsapp.status === 'connected' ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800/50 p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
                  {instance.whatsapp.status === 'connected' ? (
                    <button
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      onClick={() => handleLogoutInstance(instance._id)}
                      disabled={isProcessingLogout[instance._id]}
                    >
                      {isProcessingLogout[instance._id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="h-4 w-4" />
                          <span className="hidden sm:inline">Log Out</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      onClick={() => handleShowQR(instance._id)}
                      disabled={isProcessingQR[instance._id] || !isConnected}
                    >
                      {isProcessingQR[instance._id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <QrCode className="h-4 w-4" />
                          <span className="hidden sm:inline">Show QR</span>
                        </>
                      )}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="flex-1 sm:flex-none bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      onClick={() => openEditDialog(instance._id, instance.name)}
                      disabled={isProcessingEdit[instance._id]}
                    >
                      {isProcessingEdit[instance._id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Edit className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </>
                      )}
                    </button>
                    <button
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                      onClick={() => handleDeleteInstance(instance._id)}
                      disabled={isProcessingDelete[instance._id]}
                    >
                      {isProcessingDelete[instance._id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sortedInstances.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-4 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-zinc-400 text-sm">
                Showing {indexOfFirstInstance + 1}-{Math.min(indexOfLastInstance, sortedInstances.length)} of {sortedInstances.length} instances
              </span>
              <div className="relative ml-4">
                <label htmlFor="instances-per-page" className="sr-only">Instances per page</label>
                <select
                  id="instances-per-page"
                  className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all pr-8 shadow-sm hover:border-emerald-400"
                  value={instancesPerPage}
                  onChange={e => {
                    setInstancesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[9, 18, 27, 36, 45].map(size => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 flex items-center">
                  <ChevronDown className="h-4 w-4" />
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={handlePrevPage}
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
                onClick={handleNextPage}
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

        {/* QR Code Dialog */}
        {showQR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl p-4 sm:p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">Connect WhatsApp Device</h2>
                  <p className="text-zinc-400 text-sm sm:text-base">Scan this QR code with your WhatsApp mobile app to connect</p>
                </div>
                <button
                  onClick={() => {
                    setShowQR(false);
                    setSelectedInstanceId(null);
                    setQrCode('');
                  }}
                  className="text-zinc-400 hover:text-zinc-200 p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6 lg:gap-8">
                <div className="flex-shrink-0 w-full lg:w-auto flex justify-center">
                  {qrCode ? (
                    <div className="bg-white p-4 rounded-lg overflow-hidden transition-all duration-300">
                      <img src={qrCode} alt="QR Code" className="max-w-[250px] sm:max-w-[300px] w-full" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[250px] sm:h-[300px] w-[250px] sm:w-[300px] bg-zinc-800 rounded-lg">
                      <Loader2 className="h-10 w-10 text-zinc-500 animate-spin mb-4" />
                      <p className="text-zinc-400 text-center">Waiting for QR code...</p>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 w-full">
                  <div className="space-y-6">
                    <div className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-4 sm:p-6">
                      <h3 className="text-lg font-semibold text-zinc-200 mb-4">How to Connect</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-sm">1</div>
                          <p className="text-zinc-300 text-sm sm:text-base">Open WhatsApp on your phone</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-sm">2</div>
                          <p className="text-zinc-300 text-sm sm:text-base">Tap Menu or Settings and select Linked Devices</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-sm">3</div>
                          <p className="text-zinc-300 text-sm sm:text-base">Tap on "Link a Device"</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-sm">4</div>
                          <p className="text-zinc-300 text-sm sm:text-base">Point your phone to this screen to capture the code</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                      <p className="text-emerald-400 text-sm">
                        Once connected, you'll be able to use WhatsApp on this device
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Dialog */}
        {showSuccessDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl p-6 max-w-md w-full mx-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-6 text-emerald-400">
                  WhatsApp Connected Successfully!
                </h2>
                
                {connectedInstance && (
                  <div className="flex flex-col items-center mb-6">
                    {connectedInstance.whatsapp.profile ? (
                      <div className="relative">
                        <img
                          src={connectedInstance.whatsapp.profile}
                          alt="WhatsApp Profile"
                          className="w-24 h-24 rounded-full mb-4 border-4 border-emerald-500/20"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-zinc-900"></div>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border-4 border-emerald-500/20">
                        <Phone className="h-12 w-12 text-emerald-400" />
                      </div>
                    )}
                    <p className="text-lg font-medium text-zinc-200 mt-4">
                      {connectedInstance.whatsapp.phone || 'Unknown'}
                    </p>
                    {connectedInstance.name && (
                      <p className="text-sm text-zinc-400 mt-1">
                        {connectedInstance.name}
                      </p>
                    )}
                    <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-sm text-emerald-400 w-full text-center">
                      <p>Your WhatsApp account is now successfully connected and ready to use!</p>
                    </div>
                  </div>
                )}
                
                <button
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-6 py-2 h-12 rounded-xl transition-all duration-300"
                  onClick={() => setShowSuccessDialog(false)}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        {showEditDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl p-6 max-w-md w-full mx-4">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Edit Device Name</h2>
                <p className="text-zinc-400">Give your WhatsApp device a memorable name</p>
              </div>
              
              {selectedInstance && (
                <div className="mb-6 flex flex-col items-center">
                  {selectedInstance.whatsapp.profile ? (
                    <div className="relative flex justify-center">
                      <img
                        src={selectedInstance.whatsapp.profile}
                        alt="WhatsApp Profile"
                        className="w-20 h-20 rounded-full border-4 border-zinc-700/50"
                      />
                      <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-zinc-900 ${
                        selectedInstance.whatsapp.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                  ) : (
                    <div className="relative flex justify-center">
                      <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border-4 border-zinc-700/50">
                        <Phone className="h-8 w-8 text-zinc-400" />
                      </div>
                      <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-zinc-900 ${
                        selectedInstance.whatsapp.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                  )}
                  <p className="text-center mt-3 text-zinc-300">
                    {selectedInstance.whatsapp.phone || 'WhatsApp Device'}
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="instanceName" className="text-sm font-medium text-zinc-400">
                    Instance Name
                  </label>
                  <input
                    id="instanceName"
                    value={editInstanceName}
                    onChange={(e) => setEditInstanceName(e.target.value)}
                    placeholder="Enter device name"
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 focus:border-zinc-600 px-3 py-2 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    className="text-zinc-300 border border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 px-4 py-2 rounded-lg transition-colors"
                    onClick={() => {
                      setShowEditDialog(false);
                      setEditInstanceId(null);
                      setEditInstanceName('');
                      setSelectedInstance(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    onClick={handleEditInstance}
                    disabled={!editInstanceName.trim() || isProcessingEdit[editInstanceId!]}
                  >
                    {isProcessingEdit[editInstanceId!] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}