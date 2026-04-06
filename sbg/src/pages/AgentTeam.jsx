import React, { useState } from 'react';
import PublicHeader from '@/components/shared/PublicHeader';
import AgentTeam from '@/components/ai/AgentTeam';
import AgentWorkflowVisualizer from '@/components/agents/AgentWorkflowVisualizer';
import InterAgentCommunication from '@/components/agents/InterAgentCommunication';
import AgentDependencyGraph from '@/components/agents/AgentDependencyGraph';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Workflow, MessageSquare, GitBranch } from 'lucide-react';

export default function AgentTeamPage() {
  const [activeTab, setActiveTab] = useState('team');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PublicHeader showBackButton backLabel="العودة للرئيسية" />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-4 bg-white border-2 border-slate-200 p-1.5 h-auto">
            <TabsTrigger value="team" className="gap-2 py-3">
              <Users className="w-4 h-4" />
              <div className="text-right">
                <div className="text-sm font-semibold">الفريق</div>
                <div className="text-xs opacity-70">Meet the Team</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="gap-2 py-3">
              <Workflow className="w-4 h-4" />
              <div className="text-right">
                <div className="text-sm font-semibold">مسارات العمل</div>
                <div className="text-xs opacity-70">Workflows</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="communication" className="gap-2 py-3">
              <MessageSquare className="w-4 h-4" />
              <div className="text-right">
                <div className="text-sm font-semibold">الاتصالات</div>
                <div className="text-xs opacity-70">Communication</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="dependencies" className="gap-2 py-3">
              <GitBranch className="w-4 h-4" />
              <div className="text-right">
                <div className="text-sm font-semibold">التبعيات</div>
                <div className="text-xs opacity-70">Dependencies</div>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6">
            <AgentTeam />
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6">
            <AgentWorkflowVisualizer />
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <InterAgentCommunication />
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-6">
            <AgentDependencyGraph />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}