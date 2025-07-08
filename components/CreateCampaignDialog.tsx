"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import BasicConfiguration from './campaign-steps/BasicConfiguration';
import ChooseTemplate from './campaign-steps/ChooseTemplate';
import SelectAudience from './campaign-steps/SelectAudience';
import ScheduleCampaign from './campaign-steps/ScheduleCampaign';
import FinalStep from './campaign-steps/FinalStep';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCampaign: () => void;
  onSendCampaign: () => void;
  isCreating: boolean;
  isSending: boolean;
  // Campaign data props
  campaignName: string;
  setCampaignName: (name: string) => void;
  selectedInstances: string[];
  setSelectedInstances: (instances: string[]) => void;
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  delayRange: { start: number; end: number };
  setDelayRange: (range: { start: number; end: number }) => void;
  instances: any[];
  templates: any[];
  antdContacts: any[];
  setAntdContacts: (contacts: any[]) => void;
  recipients: any[];
  setRecipients: (recipients: any[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const CAMPAIGN_STEPS = [
  { id: 1, title: 'Basic Configuration', description: 'Enter the Campaign Name and Select Instance Details.' },
  { id: 2, title: 'Choose Template', description: 'Choose from a list of pre-approved templates or create a new template.' },
  { id: 3, title: 'Select Audience', description: 'Import recipients from Excel or add manually.' },
  { id: 4, title: 'Schedule Campaign', description: 'Configure delay settings and send messages.' },
  { id: 5, title: 'Final', description: 'Review and send your campaign to all selected numbers.' }
];

export default function CreateCampaignDialog({
  open,
  onOpenChange,
  onCreateCampaign,
  onSendCampaign,
  isCreating,
  isSending,
  campaignName,
  setCampaignName,
  selectedInstances,
  setSelectedInstances,
  selectedTemplate,
  setSelectedTemplate,
  delayRange,
  setDelayRange,
  instances,
  templates,
  antdContacts,
  setAntdContacts,
  recipients,
  setRecipients,
  showToast
}: CreateCampaignDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Reset all states when dialog opens
  useEffect(() => {
    if (open) {
      // Reset to first step
      setCurrentStep(1);
      
      // Reset all form data
      setCampaignName('');
      setSelectedInstances([]);
      setSelectedTemplate('');
      setDelayRange({ start: 3, end: 5 });
      setAntdContacts([]);
      setRecipients([{
        phone: '',
        name: '',
        variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' }
      }]);
    }
  }, [open, setCampaignName, setSelectedInstances, setSelectedTemplate, setDelayRange, setAntdContacts, setRecipients]);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!campaignName.trim()) {
        showToast('Please enter a campaign name', 'error');
        return;
      }
      if (selectedInstances.length === 0) {
        showToast('Please select at least one instance', 'error');
        return;
      }
    } else if (currentStep === 2) {
      if (!selectedTemplate) {
        showToast('Please select a template', 'error');
        return;
      }
    } else if (currentStep === 3) {
      if (antdContacts.length === 0 || antdContacts.some((contact) => !contact.number || !contact.name)) {
        showToast('All contacts must have a valid phone number and name', 'error');
        return;
      }
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    // Reset everything when closing
    setCurrentStep(1);
    setCampaignName('');
    setSelectedInstances([]);
    setSelectedTemplate('');
    setDelayRange({ start: 3, end: 5 });
    setAntdContacts([]);
    setRecipients([{
      phone: '',
      name: '',
      variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' }
    }]);
    onOpenChange(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicConfiguration
            campaignName={campaignName}
            setCampaignName={setCampaignName}
            selectedInstances={selectedInstances}
            setSelectedInstances={setSelectedInstances}
            instances={instances}
          />
        );
      case 2:
        return (
          <ChooseTemplate
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            templates={templates}
          />
        );
      case 3:
        return (
          <SelectAudience
            antdContacts={antdContacts}
            setAntdContacts={setAntdContacts}
            recipients={recipients}
            setRecipients={setRecipients}
            showToast={showToast}
          />
        );
      case 4:
        return (
          <ScheduleCampaign
            campaignName={campaignName}
            selectedTemplate={selectedTemplate}
            selectedInstances={selectedInstances}
            antdContacts={antdContacts}
            delayRange={delayRange}
            setDelayRange={setDelayRange}
            templates={templates}
            onSendCampaign={onSendCampaign}
            isSending={isSending}
          />
        );
      case 5:
        return (
          <FinalStep
            campaignName={campaignName}
            selectedTemplate={selectedTemplate}
            selectedInstances={selectedInstances}
            antdContacts={antdContacts}
            delayRange={delayRange}
            templates={templates}
            instances={instances}
            onSendCampaign={onSendCampaign}
            isSending={isSending}
            onClose={handleClose}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Campaign</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Connect with your customers through whatsapp.
          </DialogDescription>
        </DialogHeader>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {CAMPAIGN_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-zinc-600 text-zinc-400'
              }`}>
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-zinc-200' : 'text-zinc-400'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < CAMPAIGN_STEPS.length - 1 && (
                <div className={`hidden sm:block w-16 h-0.5 ml-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-zinc-600'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 5 && (
          <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              onClick={handleNext}
              className="bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}