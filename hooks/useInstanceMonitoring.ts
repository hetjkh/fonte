import { useState, useEffect, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';

interface Campaign {
  _id: string;
  instances?: any[];
}

interface ConnectionStatus {
  isConnected: boolean;
  message: string;
  subMessage: string;
}

export const useInstanceMonitoring = (
  campaignData: Campaign | null,
  initialSelectedInstances: string[],
  isProcessing: boolean,
  isPaused: boolean
) => {
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>(initialSelectedInstances);
  const [instancesDisconnected, setInstancesDisconnected] = useState(false);
  const [disconnectionReason, setDisconnectionReason] = useState<string>('');
  const [canResumeAfterReconnect, setCanResumeAfterReconnect] = useState(false);

  const instanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastInstanceStatusRef = useRef<{ [key: string]: string }>({});

  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  }, []);

  const fetchInstances = useCallback(async () => {
    const authToken = getToken();
    if (!authToken) return;

    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.status === 401) return;

      const data = await response.json();
      if (data.status) {
        const fetchedInstances = data.instances || [];
        setInstances(fetchedInstances);
        return fetchedInstances;
      }
    } catch (err) {
      console.error('Error fetching instances:', err);
    }
    return [];
  }, [getToken]);

  const checkInstanceConnections = useCallback(() => {
    if (!selectedInstances.length) return;

    const currentInstanceStatuses: { [key: string]: string } = {};
    selectedInstances.forEach(instanceId => {
      const instance = instances.find(inst => inst._id === instanceId);
      currentInstanceStatuses[instanceId] = instance?.whatsapp?.status || 'disconnected';
    });

    const connectedInstances = selectedInstances.filter(instanceId => 
      currentInstanceStatuses[instanceId] === 'connected'
    );
    
    const disconnectedInstances = selectedInstances.filter(instanceId => 
      currentInstanceStatuses[instanceId] !== 'connected'
    );

    if (connectedInstances.length === 0 && (isProcessing || isPaused)) {
      setInstancesDisconnected(true);
      setDisconnectionReason(`All ${disconnectedInstances.length} selected instance(s) disconnected`);
      setCanResumeAfterReconnect(false);
    } else if (connectedInstances.length > 0 && instancesDisconnected && isPaused) {
      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(true);
      setDisconnectionReason('');
    }

    lastInstanceStatusRef.current = currentInstanceStatuses;
  }, [selectedInstances, instances, isProcessing, isPaused, instancesDisconnected]);

  // Set selected instances from campaign data
  useEffect(() => {
    if (campaignData?.instances) {
      const instanceIds = campaignData.instances.map(inst => inst._id || inst);
      setSelectedInstances(instanceIds);
    }
  }, [campaignData]);

  // Monitor instances when campaign is active
  useEffect(() => {
    if (selectedInstances.length > 0 && (isProcessing || isPaused)) {
      fetchInstances();
      
      instanceCheckIntervalRef.current = setInterval(() => {
        fetchInstances().then(() => {
          checkInstanceConnections();
        });
      }, 2000);
      
      return () => {
        if (instanceCheckIntervalRef.current) {
          clearInterval(instanceCheckIntervalRef.current);
          instanceCheckIntervalRef.current = null;
        }
      };
    } else if (instanceCheckIntervalRef.current) {
      clearInterval(instanceCheckIntervalRef.current);
      instanceCheckIntervalRef.current = null;
    }
  }, [selectedInstances, isProcessing, isPaused, fetchInstances, checkInstanceConnections]);

  const getConnectedInstancesCount = () => {
    return instances.filter(instance => 
      selectedInstances.includes(instance._id) && instance.whatsapp?.status === 'connected'
    ).length;
  };

  const connectionStatus: ConnectionStatus = getConnectedInstancesCount() === 0 && selectedInstances.length > 0
    ? {
        isConnected: false,
        message: '🚨 All Instances Disconnected - Campaign Auto-Paused',
        subMessage: `0 of ${selectedInstances.length} instances connected`
      }
    : getConnectedInstancesCount() < selectedInstances.length && selectedInstances.length > 0
      ? {
          isConnected: false,
          message: '⚠️ Some Instances Disconnected',
          subMessage: `${getConnectedInstancesCount()} of ${selectedInstances.length} instances connected`
        }
      : selectedInstances.length > 0
        ? {
            isConnected: true,
            message: '✅ All Instances Connected',
            subMessage: `${getConnectedInstancesCount()} of ${selectedInstances.length} instances connected`
          }
        : {
            isConnected: false,
            message: '❓ No Instances Selected',
            subMessage: 'No instances to monitor'
          };

  return {
    instances,
    selectedInstances,
    instancesDisconnected,
    disconnectionReason,
    canResumeAfterReconnect,
    connectionStatus
  };
};