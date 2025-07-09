import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import Cookies from 'js-cookie';

export function useCampaignRealtime(campaignId: string) {
  // --- State ---
  const [campaign, setCampaign] = useState<any>(null);
  const [recipientStatuses, setRecipientStatuses] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [delayRange, setDelayRange] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    message: 'Initializing...',
    subMessage: 'Setting up connection monitoring',
    connectedCount: 0,
    totalCount: 0,
    isLoading: true
  });
  const [controlStates, setControlStates] = useState({
    isStopping: false,
    isPausing: false,
    isResuming: false
  });
  const [isStarting, setIsStarting] = useState(false);

  // --- Refs ---
  const lastProgressUpdateRef = useRef<number>(0);
  const hasLoadedDetailsRef = useRef(false);
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const socketListenersSetupRef = useRef(false);
  const instanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastInstanceFetchRef = useRef(0);
  const instanceCacheRef = useRef<{ data: any[], timestamp: number } | null>(null);
  const isFetchingInstancesRef = useRef(false);

  // --- Token ---
  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  }, []);
  const token = getToken();

  // --- Socket ---
  const { on, off, isConnected: socketConnected } = useSocket({
    token,
    onConnect: () => {},
    onDisconnect: () => {},
    onError: () => {},
  });

  // --- Fetch campaign details ---
  const fetchCampaignDetails = useCallback(async (forceRefresh = false) => {
    if (!token || (hasLoadedDetailsRef.current && !forceRefresh)) return;
    setIsLoading(true);
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/template/message/get', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: campaignId })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status && data.message) {
          const detailedCampaign = data.message;
          setCampaign(detailedCampaign);
          setSelectedInstances(detailedCampaign.instanceIds || []);
          setDelayRange(detailedCampaign.delayRange || { start: 1, end: 1 });
          setIsPaused(detailedCampaign.status === 'paused');
          setIsStopped(detailedCampaign.status === 'stopped');
          setIsProcessing(detailedCampaign.status === 'processing');
          setRecipientStatuses(updateRecipientStatuses(detailedCampaign));
          if (!hasLoadedDetailsRef.current) hasLoadedDetailsRef.current = true;
        }
      }
    } catch (error) {
      // handle error
    } finally {
      setIsLoading(false);
    }
  }, [token, campaignId]);

  // --- Update recipient statuses ---
  const updateRecipientStatuses = useCallback((campaign: any) => {
    if (!campaign.recipients) return [];
    const statuses = new Array(campaign.recipients.length).fill('pending');
    const sentCount = campaign.statistics?.sent || campaign.sentMessages || 0;
    const failedCount = campaign.statistics?.failed || campaign.failedMessages || 0;
    const notExistCount = campaign.statistics?.notExist || campaign.notExistMessages || 0;
    let index = 0;
    
    // First, mark sent/failed/not_exist recipients
    for (let i = 0; i < sentCount && index < statuses.length; i++, index++) statuses[index] = 'sent';
    for (let i = 0; i < failedCount && index < statuses.length; i++, index++) statuses[index] = 'failed';
    for (let i = 0; i < notExistCount && index < statuses.length; i++, index++) statuses[index] = 'not_exist';
    
    // Check individual recipient statuses from backend
    campaign.recipients.forEach((recipient: any, idx: number) => {
      if (recipient.status && recipient.status !== 'pending') {
        statuses[idx] = recipient.status === 'not_exist' ? 'not_exist' : recipient.status;
      }
    });
    
    // If campaign is stopped, mark all remaining pending recipients as stopped
    if (campaign.status === 'stopped') {
      for (let i = 0; i < statuses.length; i++) {
        if (statuses[i] === 'pending') statuses[i] = 'stopped';
      }
    }
    
    return statuses;
  }, []);

  // --- Fetch instances ---
  const fetchInstances = useCallback(async (force = false) => {
    if (isFetchingInstancesRef.current) return;
    isFetchingInstancesRef.current = true;
    const now = Date.now();
    const CACHE_DURATION = 5000;
    const MIN_FETCH_INTERVAL = 2000;
    if (!force && instanceCacheRef.current && (now - instanceCacheRef.current.timestamp) < CACHE_DURATION) {
      setInstances(instanceCacheRef.current.data);
      isFetchingInstancesRef.current = false;
      return instanceCacheRef.current.data;
    }
    if (!force && now - lastInstanceFetchRef.current < MIN_FETCH_INTERVAL) {
      isFetchingInstancesRef.current = false;
      return instances;
    }
    lastInstanceFetchRef.current = now;
    const authToken = getToken();
    if (!authToken) return [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page: 0, limit: 100, instance_status: 'connected' }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.status === 401) return [];
      const data = await response.json();
      if (data.status && data.instances) {
        const fetchedInstances = data.instances;
        instanceCacheRef.current = { data: fetchedInstances, timestamp: now };
        setInstances(fetchedInstances);
        isFetchingInstancesRef.current = false;
        return fetchedInstances;
      }
    } catch (error) {
      // handle error
    }
    isFetchingInstancesRef.current = false;
    return [];
  }, [getToken, instances]);

  // --- Check instance connections ---
  const checkInstanceConnectionsImmediate = useCallback((instancesData: any[] = instances) => {
    if (selectedInstances.length === 0) {
      setConnectionStatus({
        isConnected: false,
        message: 'No instances selected',
        subMessage: 'Select instances to monitor connection',
        connectedCount: 0,
        totalCount: 0,
        isLoading: false
      });
      return;
    }
    const connectedInstances = selectedInstances.filter(instanceId => {
      const instance = instancesData.find(inst => inst._id === instanceId);
      return instance?.whatsapp?.status === 'connected';
    });
    const connectedCount = connectedInstances.length;
    const totalCount = selectedInstances.length;
    let status;
    if (connectedCount === totalCount && totalCount > 0) {
      status = {
        isConnected: true,
        message: 'All instances connected',
        subMessage: `${connectedCount} of ${totalCount} instances ready`,
        connectedCount,
        totalCount,
        isLoading: false
      };
    } else if (connectedCount > 0) {
      status = {
        isConnected: false,
        message: 'Partial connection',
        subMessage: `${connectedCount} of ${totalCount} instances connected`,
        connectedCount,
        totalCount,
        isLoading: false
      };
    } else {
      status = {
        isConnected: false,
        message: 'Instances disconnected',
        subMessage: `0 of ${totalCount} instances connected`,
        connectedCount,
        totalCount,
        isLoading: false
      };
    }
    setConnectionStatus(status);
  }, [selectedInstances, instances]);

  // --- Instance monitoring interval ---
  useEffect(() => {
    if (selectedInstances.length === 0) return;
    checkInstanceConnectionsImmediate();
    instanceCheckIntervalRef.current = setInterval(async () => {
      const freshInstances = await fetchInstances();
      if (freshInstances) checkInstanceConnectionsImmediate(freshInstances);
    }, 15000);
    return () => {
      if (instanceCheckIntervalRef.current) {
        clearInterval(instanceCheckIntervalRef.current);
        instanceCheckIntervalRef.current = null;
      }
    };
  }, [selectedInstances, checkInstanceConnectionsImmediate, fetchInstances]);

  // --- Initial load ---
  useEffect(() => {
    fetchCampaignDetails();
    fetchInstances(true);
  }, [fetchCampaignDetails, fetchInstances]);

  // --- Socket event handlers (progress, complete, stopped, paused, resumed) ---
  const handleCampaignProgress = useCallback(
    (data: any) => {
      if (!campaign || data.campaignId !== campaign._id) return;

      const now = Date.now();
      if (now - lastProgressUpdateRef.current < 500) return;
      lastProgressUpdateRef.current = now;

      console.log('Campaign progress update:', data);

      // Ignore progress updates during control actions to prevent state conflicts
      if (controlStates.isStopping || controlStates.isPausing || controlStates.isResuming) {
        console.log('Ignoring progress update during control action');
        return;
      }

      setCampaign((prev: any) =>
        prev
          ? {
              ...prev,
              status: data.status,
              sentMessages: data.sent || 0,
              failedMessages: data.failed || 0,
              notExistMessages: data.notExist || 0,
              totalMessages: data.total || prev.totalMessages,
              delayRange: data.delayRange || prev.delayRange,
            }
          : null
      );

      if (data.lastRecipient && data.lastMessageStatus && campaign) {
        const recipientIndex = campaign.recipients.findIndex(
          (r: any) => r.name === data.lastRecipient || r.phone === data.lastRecipient
        );
        if (recipientIndex !== -1) {
          setRecipientStatuses((prev) => {
            const newStatuses = [...prev];
            newStatuses[recipientIndex] = data.lastMessageStatus;
            return newStatuses;
          });
        }
      }

      if (data.status === 'completed') {
        setIsProcessing(false);
        setIsPaused(false);
        setIsStopped(false);
        setControlStates({ isStopping: false, isPausing: false, isResuming: false });
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(() => {
            fetchCampaignDetails(true);
          }, 1000);
        }
      } else if (data.status === 'stopped') {
        setIsProcessing(false);
        setIsPaused(false);
        setIsStopped(true);
        setControlStates({ isStopping: false, isPausing: false, isResuming: false });
        setRecipientStatuses((prev) => prev.map((status) => (status === 'pending' ? 'stopped' : status)));
      } else if (data.status === 'processing') {
        setIsProcessing(true);
        setIsPaused(false);
        setIsStopped(false);
        setControlStates({ isStopping: false, isPausing: false, isResuming: false });
      } else if (data.status === 'paused') {
        setIsProcessing(false);
        setIsPaused(true);
        setIsStopped(false);
        setControlStates({ isStopping: false, isPausing: false, isResuming: false });
      }
    },
    [campaign, fetchCampaignDetails, controlStates]
  );

  const handleCampaignComplete = useCallback(
    (data: any) => {
      if (!campaign || data.campaignId !== campaign._id) return;
      setCampaign((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'completed',
              sentMessages: data.sent || 0,
              failedMessages: data.failed || 0,
              notExistMessages: data.notExist || 0,
              delayRange: data.delayRange || prev.delayRange,
            }
          : null
      );
      setIsProcessing(false);
      setIsPaused(false);
      setIsStopped(false);
      setControlStates({ isStopping: false, isPausing: false, isResuming: false });
      setRecipientStatuses((prev) => {
        const newStatuses = [...prev];
        const sentCount = data.sent || 0;
        const failedCount = data.failed || 0;
        const notExistCount = data.notExist || 0;
        let index = 0;
        for (let i = 0; i < sentCount && index < newStatuses.length; i++, index++) newStatuses[index] = 'sent';
        for (let i = 0; i < failedCount && index < newStatuses.length; i++, index++) newStatuses[index] = 'failed';
        for (let i = 0; i < notExistCount && index < newStatuses.length; i++, index++) newStatuses[index] = 'not_exist';
        return newStatuses;
      });
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          fetchCampaignDetails(true);
        }, 1500);
      }
    },
    [campaign, fetchCampaignDetails]
  );

  const handleCampaignStopped = useCallback(
    (data: any) => {
      if (!campaign || data.campaignId !== campaign._id) return;
      setIsStopped(true);
      setIsProcessing(false);
      setIsPaused(false);
      setControlStates({ isStopping: false, isPausing: false, isResuming: false });
      setCampaign((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'stopped',
              sentMessages: data.sent || prev.sentMessages,
              failedMessages: data.failed || prev.failedMessages,
              notExistMessages: data.notExist || prev.notExistMessages,
              delayRange: data.delayRange || prev.delayRange,
            }
          : null
      );
      setRecipientStatuses((prev) => prev.map((status) => (status === 'pending' ? 'stopped' : status)));
      fetchCampaignDetails(true);
    },
    [campaign, fetchCampaignDetails]
  );

  const handleCampaignPaused = useCallback(
    (data: any) => {
      if (!campaign || data.campaignId !== campaign._id) return;
      setIsPaused(true);
      setIsProcessing(false);
      setIsStopped(false);
      setControlStates({ isStopping: false, isPausing: false, isResuming: false });
      setCampaign((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'paused',
              delayRange: data.delayRange || prev.delayRange,
            }
          : null
      );
    },
    [campaign]
  );

  const handleCampaignResumed = useCallback(
    (data: any) => {
      if (!campaign || data.campaignId !== campaign._id) return;
      setIsPaused(false);
      setIsProcessing(true);
      setIsStopped(false);
      setControlStates({ isStopping: false, isPausing: false, isResuming: false });
      setCampaign((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'processing',
              delayRange: data.delayRange || prev.delayRange,
            }
          : null
      );
    },
    [campaign]
  );

  useEffect(() => {
    if (!socketConnected || !campaign || socketListenersSetupRef.current) return;
    socketListenersSetupRef.current = true;
    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);
    on('campaign.stopped', handleCampaignStopped);
    on('campaign.paused', handleCampaignPaused);
    on('campaign.resumed', handleCampaignResumed);
    return () => {
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignComplete);
      off('campaign.stopped', handleCampaignStopped);
      off('campaign.paused', handleCampaignPaused);
      off('campaign.resumed', handleCampaignResumed);
      socketListenersSetupRef.current = false;
    };
  }, [socketConnected, campaign?._id, on, off, handleCampaignProgress, handleCampaignComplete, handleCampaignStopped, handleCampaignPaused, handleCampaignResumed]);

  // --- Campaign control handlers (pause, resume, stop) ---
  const handleCampaignControl = useCallback(
    async (action: 'stop' | 'pause' | 'resume') => {
      if (!campaign) return;
      if (controlStates.isStopping || controlStates.isPausing || controlStates.isResuming) return;
      setControlStates(prev => ({
        ...prev,
        isStopping: action === 'stop',
        isPausing: action === 'pause',
        isResuming: action === 'resume'
      }));
      if (action === 'stop') {
        setIsProcessing(false);
        setIsPaused(false);
        setIsStopped(true);
        setCampaign((prev: any) => (prev ? { ...prev, status: 'stopped' } : null));
        setRecipientStatuses((prev) => prev.map((status) => (status === 'pending' ? 'stopped' : status)));
      } else if (action === 'pause') {
        setIsProcessing(false);
        setIsPaused(true);
        setIsStopped(false);
        setCampaign((prev: any) => (prev ? { ...prev, status: 'paused' } : null));
      } else {
        setIsProcessing(true);
        setIsPaused(false);
        setIsStopped(false);
        setCampaign((prev: any) => (prev ? { ...prev, status: 'processing' } : null));
      }
      try {
        const authToken = getToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        let endpoint = '';
        if (action === 'pause') {
          endpoint = 'https://whatsapp.recuperafly.com/api/campaign/pause';
        } else if (action === 'stop') {
          endpoint = 'https://whatsapp.recuperafly.com/api/campaign/stop';
        } else if (action === 'resume') {
          endpoint = 'https://whatsapp.recuperafly.com/api/campaign/resume';
        } else {
          endpoint = 'https://whatsapp.recuperafly.com/api/template/campaign/control';
        }
        const payload = { campaignId: campaign._id };
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const result = await response.json();
        if (result.status) {
          if (action === 'resume') {
            setCampaign((prev: any) => prev ? { ...prev, delayRange } : null);
          }
          
          // Add a small delay to prevent immediate progress updates from overriding the state
          setTimeout(() => {
            setControlStates({ isStopping: false, isPausing: false, isResuming: false });
          }, 1000);
        } else {
          // Revert UI state if server request failed
          if (action === 'stop') {
            setIsProcessing(true);
            setIsPaused(false);
            setIsStopped(false);
            setCampaign((prev: any) => (prev ? { ...prev, status: 'processing' } : null));
          } else if (action === 'pause') {
            setIsProcessing(true);
            setIsPaused(false);
            setIsStopped(false);
            setCampaign((prev: any) => (prev ? { ...prev, status: 'processing' } : null));
          } else {
            setIsProcessing(false);
            setIsPaused(true);
            setIsStopped(false);
            setCampaign((prev: any) => (prev ? { ...prev, status: 'paused' } : null));
          }
          setControlStates({ isStopping: false, isPausing: false, isResuming: false });
        }
      } catch (error) {
        console.error(`Error ${action}ing campaign:`, error);
        // Revert UI state on error
        if (action === 'stop') {
          setIsProcessing(true);
          setIsPaused(false);
          setIsStopped(false);
          setCampaign((prev: any) => (prev ? { ...prev, status: 'processing' } : null));
        } else if (action === 'pause') {
          setIsProcessing(true);
          setIsPaused(false);
          setIsStopped(false);
          setCampaign((prev: any) => (prev ? { ...prev, status: 'processing' } : null));
        } else {
          setIsProcessing(false);
          setIsPaused(true);
          setIsStopped(false);
          setCampaign((prev: any) => (prev ? { ...prev, status: 'paused' } : null));
        }
        setControlStates({ isStopping: false, isPausing: false, isResuming: false });
      }
    },
    [campaign, getToken, delayRange, controlStates]
  );

  const handleStopCampaign = useCallback(() => handleCampaignControl('stop'), [handleCampaignControl]);
  const handlePauseCampaign = useCallback(() => handleCampaignControl('pause'), [handleCampaignControl]);
  const handleResumeCampaign = useCallback(() => handleCampaignControl('resume'), [handleCampaignControl]);

  const handleStartCampaign = useCallback(async () => {
    if (!campaign) return;
    setIsStarting(true);
    setIsProcessing(true);
    setIsPaused(false);
    setIsStopped(false);
    try {
      const authToken = getToken();
      await fetch('https://whatsapp.recuperafly.com/api/campaign/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId: campaign._id }),
      });
      setCampaign((prev: any) => prev ? { ...prev, status: 'processing' } : null);
    } catch (error) {
      // handle error
    } finally {
      setIsStarting(false);
    }
  }, [campaign, getToken]);

  // --- Refresh handler ---
  const refreshCampaignDetails = async () => {
    if (!campaign || !token) return;
    setIsRefreshing(true);
    hasLoadedDetailsRef.current = false;
    try {
      await fetchCampaignDetails(true);
      await fetchInstances(true);
    } catch (error) {
      // handle error
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- Return all state and handlers needed for the UI ---
  return {
    campaign,
    recipientStatuses,
    isProcessing,
    isPaused,
    isStopped,
    isLoading,
    isRefreshing,
    statusFilter,
    setStatusFilter,
    instances,
    selectedInstances,
    delayRange,
    setDelayRange,
    connectionStatus,
    controlStates,
    setControlStates,
    fetchCampaignDetails,
    fetchInstances,
    handleStopCampaign,
    handlePauseCampaign,
    handleResumeCampaign,
    refreshCampaignDetails,
    handleStartCampaign,
    isStarting,
  };
} 