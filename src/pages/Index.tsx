import { useState } from "react";
import Header from "@/components/layout/Header";
import TabNavigation from "@/components/layout/TabNavigation";
import ChatTab from "@/components/chat/ChatTab";
import MindMapTab from "@/components/mindmap/MindMapTab";
import CatalogTab from "@/components/catalog/CatalogTab";

type TabType = "chat" | "mindmap" | "catalog";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAdmin={isAdmin} onToggleRole={() => setIsAdmin(!isAdmin)} />
      
      {/* Desktop Tab Navigation */}
      <div className="hidden md:block pt-16">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      
      {/* Mobile spacer */}
      <div className="md:hidden h-16" />

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
          {activeTab === "chat" && <ChatTab />}
          {activeTab === "mindmap" && <MindMapTab isAdmin={isAdmin} />}
          {activeTab === "catalog" && <CatalogTab isAdmin={isAdmin} />}
        </div>
      </main>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default Index;
