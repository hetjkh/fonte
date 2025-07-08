"use client";

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ScheduleCampaignProps {
  campaignName: string;
  selectedTemplate: string;
  selectedInstances: string[];
  antdContacts: any[];
  delayRange: { start: number; end: number };
  setDelayRange: (range: { start: number; end: number }) => void;
  templates: any[];
  onCreateCampaign: () => void;
  isCreating: boolean;
}

export default function ScheduleCampaign({
  campaignName,
  selectedTemplate,
  selectedInstances,
  antdContacts,
  delayRange,
  setDelayRange,
  templates,
  onCreateCampaign,
  isCreating
}: ScheduleCampaignProps) {
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreateCampaign = async () => {
    await onCreateCampaign();
    setShowSuccessPopup(true);
  };

  const handleSendCampaign = async () => {
    setIsSending(true);
    setErrorMessage('');
    
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1] || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Get campaignId from localStorage
      const campaignId = localStorage.getItem('currentCampaignId');
      if (!campaignId) {
        throw new Error('Campaign ID not found');
      }
      
      const response = await fetch('https://whatsapp.recuperafly.com/api/campaign/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status) {
        // Redirect to the campaign [id] page instead of messaging dashboard
        window.location.href = `/dashboard/campaign/final/${campaignId}`;
      } else {
        throw new Error(result.message || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send campaign. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Schedule Campaign</h3>
        <p className="text-zinc-400 mb-6">Configure delay settings and create your campaign.</p>
      </div>

      {/* Campaign Summary */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-zinc-200 mb-4">Campaign Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-zinc-400">Campaign Name</Label>
            <p className="text-zinc-200 font-medium">{campaignName}</p>
          </div>
          <div>
            <Label className="text-zinc-400">Selected Template</Label>
            <p className="text-zinc-200 font-medium">
              {templates.find(t => t._id === selectedTemplate)?.name || 'Template selected'}
            </p>
          </div>
          <div>
            <Label className="text-zinc-400">Selected Instances</Label>
            <p className="text-zinc-200 font-medium">
              {selectedInstances.length} instances
            </p>
          </div>
          <div>
            <Label className="text-zinc-400">Total Recipients</Label>
            <p className="text-zinc-200 font-medium">{antdContacts.length} recipients</p>
          </div>
        </div>
      </div>

      {/* Delay Configuration */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-zinc-200 mb-4">Delay Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400">Starting Delay (seconds)</Label>
            <Input
              type="number"
              value={delayRange.start}
              onChange={(e) => setDelayRange({ ...delayRange, start: parseInt(e.target.value) || 0 })}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
              min="1"
            />
          </div>
          <div>
            <Label className="text-zinc-400">Ending Delay (seconds)</Label>
            <Input
              type="number"
              value={delayRange.end}
              onChange={(e) => setDelayRange({ ...delayRange, end: parseInt(e.target.value) || 0 })}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
              min="1"
            />
          </div>
        </div>
        <p className="text-zinc-400 text-sm mt-2">
          Messages will be sent with a random delay between {delayRange.start} and {delayRange.end} seconds.
        </p>
      </div>

      {/* Create Campaign Button */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-blue-400 font-medium mb-1">Ready to Create Campaign</h4>
            <p className="text-blue-300 text-sm">
              Click the button below to create your campaign. You'll be able to start sending messages immediately.
            </p>
          </div>
          <Button
            onClick={handleCreateCampaign}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center">
              Campaign Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-300">
              Your campaign "{campaignName}" has been created successfully. 
              Would you like to start sending messages now?
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            
            {/* Error Message Display */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{errorMessage}</p>
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessPopup(false);
                  // Redirect to the campaign [id] page instead of messaging dashboard
                  const campaignId = localStorage.getItem('currentCampaignId');
                  if (campaignId) {
                    window.location.href = `/dashboard/campaign/final/${campaignId}`;
                  } else {
                    window.location.href = '/dashboard/messaging';
                  }
                }}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                Later
              </Button>
              <Button
                onClick={handleSendCampaign}
                disabled={isSending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    OK, Send Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}