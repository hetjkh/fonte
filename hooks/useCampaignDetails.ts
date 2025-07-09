import { useState, useEffect, useCallback, useRef } from 'react';

interface Campaign {
  _id: string;
  name: string;
  recipients: any[];
  status: 'completed' | 'failed' | 'processing' | 'paused' | 'stopped';
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  notExistMessages?: number;
  statistics?: {
    total: number;
    sent: number;
    failed: number;
    notExist: number;
  };
  instances?: any[];
  delayRange?: { start: number; end: number };
}

export const useCampaignDetails = (campaign: Campaign | null, open: boolean, token: string | null) => {
  const [campaignData, setCampaignData] = useState<Campaign | null>(campaign);
  const [recipientStatuses, setRecipientStatuses] = useState<string[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [delayRange, setDelayRange] = useState<{ start: number; end: number }>(
    campaign?.delayRange || { start: 1, end: 1 }
  );

  const hasLoadedDetailsRef = useRef(false);

  const updateRecipientStatuses = useCallback((campaign: Campaign) => {
    if (!campaign.recipients) return [];

    const statuses = new Array(campaign.recipients.length).fill('pending');
    const sentCount = campaign.statistics?.sent || campaign.sentMessages || 0;
    const failedCount = campaign.statistics?.failed || campaign.failedMessages || 0;
    const notExistCount = campaign.statistics?.notExist || campaign.notExistMessages || 0;

    let index = 0;

    // First, mark sent/failed/not_exist recipients
    for (let i = 0; i < sentCount && index < statuses.length; i++, index++) {
      statuses[index] = 'sent';
    }

    for (let i = 0; i < failedCount && index < statuses.length; i++, index++) {
      statuses[index] = 'failed';
    }

    for (let i = 0; i < notExistCount && index < statuses.length; i++, index++) {
      statuses[index] = 'not_exist';
    }

    // Check individual recipient statuses from backend
    campaign.recipients.forEach((recipient: any, idx: number) => {
      if (recipient.status && recipient.status !== 'pending') {
        statuses[idx] = recipient.status === 'not_exist' ? 'not_exist' : recipient.status;
      }
    });

    // If campaign is stopped, mark all remaining pending recipients as stopped
    if (campaign.status === 'stopped') {
      for (let i = 0; i < statuses.length; i++) {
        if (statuses[i] === 'pending') {
          statuses[i] = 'stopped';
        }
      }
    }

    return statuses;
  }, []);

  const loadCampaignDetails = useCallback(async (campaignId: string, forceRefresh = false) => {
    if (!token || (hasLoadedDetailsRef.current && !forceRefresh)) return;

    setIsLoadingDetails(true);
    try {
      const response = await fetch(`https://whatsapp.recuperafly.com/api/template/message/get`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: campaignId }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.status && data.message) {
          const detailedCampaign = data.message;
          const newDelayRange = campaign?.delayRange || detailedCampaign.delayRange || { start: 1, end: 1 };

          setCampaignData((prev) => ({
            ...prev,
            ...detailedCampaign,
            totalMessages: detailedCampaign.statistics?.total || detailedCampaign.recipients?.length || 0,
            sentMessages: detailedCampaign.statistics?.sent || 0,
            failedMessages: detailedCampaign.statistics?.failed || 0,
            notExistMessages: detailedCampaign.statistics?.notExist || 0,
            delayRange: newDelayRange,
          }));

          setDelayRange(newDelayRange);

          const statuses = updateRecipientStatuses(detailedCampaign);
          setRecipientStatuses(statuses);

          if (!hasLoadedDetailsRef.current) {
            hasLoadedDetailsRef.current = true;
          }
        }
      }
    } catch (error) {
      console.error('Error loading campaign details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [token, updateRecipientStatuses, campaign?.delayRange]);

  useEffect(() => {
    if (campaign && open && !hasLoadedDetailsRef.current) {
      setCampaignData(campaign);
      setDelayRange(campaign.delayRange || { start: 1, end: 1 });
      loadCampaignDetails(campaign._id);
    }
  }, [campaign, open, loadCampaignDetails]);

  useEffect(() => {
    if (!open) {
      hasLoadedDetailsRef.current = false;
      setRecipientStatuses([]);
      setIsLoadingDetails(false);
      setDelayRange({ start: 1, end: 1 });
    }
  }, [open]);

  return {
    campaignData,
    setCampaignData,
    recipientStatuses,
    setRecipientStatuses,
    isLoadingDetails,
    loadCampaignDetails,
    delayRange,
    setDelayRange
  };
};