"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';

interface CampaignStatsProps {
  stats: {
    total: number;
    completed: number;
    failed: number;
  };
}

export default function CampaignStats({ stats }: CampaignStatsProps) {
  return (
 <div className="flex flex-col sm:flex-row justify-between items-center gap-6 py-4">
  {/* Total Card */}
  <Card className="bg-zinc-900/80 border-zinc-800/80 w-full sm:w-80 transform hover:scale-105 transition-transform duration-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-base sm:text-lg font-medium">Total</p>
          <p className="text-3xl sm:text-4xl font-bold text-white">{stats.total}</p>
        </div>
        <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500" />
      </div>
    </CardContent>
  </Card>

  {/* Completed Card */}
  <Card className="bg-zinc-900/80 border-zinc-800/80 w-full sm:w-80 transform hover:scale-105 transition-transform duration-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-base sm:text-lg font-medium">Completed</p>
          <p className="text-3xl sm:text-4xl font-bold text-white">{stats.completed}</p>
        </div>
        <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
      </div>
    </CardContent>
  </Card>

  {/* Failed Card */}
  <Card className="bg-zinc-900/80 border-zinc-800/80 w-full sm:w-80 transform hover:scale-105 transition-transform duration-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-base sm:text-lg font-medium">Failed</p>
          <p className="text-3xl sm:text-4xl font-bold text-white">{stats.failed}</p>
        </div>
        <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500" />
      </div>
    </CardContent>
  </Card>
</div>
  );
}