import { useState, useCallback, useRef } from 'react';

interface Campaign {
  _id: string;
  status: string;
}

export const useCampaignControl = (
  campaignData: Campaign | null, 
  token: string | null,
  delayRange: { start: number; end: number }
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const isStoppingRef = useRef(false);
  const isPausingRef = useRef(false);
  const isResumingRef = useRef(false);

  const handleCampaignControl = useCallback(
    async (action: 'stop' | 'pause' | 'resume') => {
      if (!campaignData || !token) return;

      if (action === 'stop' && isStoppingRef.current) return;
      if (action === 'pause' && isPausingRef.current) return;
      if (action === 'resume' && isResumingRef.current) return;

      // Set control flags
      if (action === 'stop') {
        isStoppingRef.current = true;
      } else if (action === 'pause') {
        isPausingRef.current = true;
      } else {
        isResumingRef.current = true;
      }

      // Optimistic UI update
      if (action === 'stop') {
        setIsProcessing(false);
        setIsPaused(false);
        setIsStopped(true);
      } else if (action === 'pause') {
        setIsProcessing(false);
        setIsPaused(true);
        setIsStopped(false);
      } else {
        setIsProcessing(true);
        setIsPaused(false);
        setIsStopped(false);
      }

      try {
        const payload = {
          campaignId: campaignData._id,
          action,
          ...(action === 'resume' && { delayRange }),
        };

        const response = await fetch('https://whatsapp.recuperafly.com/api/template/campaign/control', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!result.status) {
          console.error(`Campaign ${action} failed:`, result.message);
          // Revert UI state on failure
          if (action === 'stop') {
            setIsProcessing(true);
            setIsPaused(false);
            setIsStopped(false);
          } else if (action === 'pause') {
            setIsProcessing(true);
            setIsPaused(false);
            setIsStopped(false);
          } else {
            setIsProcessing(false);
            setIsPaused(true);
            setIsStopped(false);
          }
        }
      } catch (error) {
        console.error(`Error ${action}ing campaign:`, error);
        // Revert UI state on error
        if (action === 'stop') {
          setIsProcessing(true);
          setIsPaused(false);
          setIsStopped(false);
        } else if (action === 'pause') {
          setIsProcessing(true);
          setIsPaused(false);
          setIsStopped(false);
        } else {
          setIsProcessing(false);
          setIsPaused(true);
          setIsStopped(false);
        }
      } finally {
        // Reset control flags
        isStoppingRef.current = false;
        isPausingRef.current = false;
        isResumingRef.current = false;
      }
    },
    [campaignData, token, delayRange]
  );

  return {
    isProcessing,
    isPaused,
    isStopped,
    setIsProcessing,
    setIsPaused,
    setIsStopped,
    handleCampaignControl
  };
};