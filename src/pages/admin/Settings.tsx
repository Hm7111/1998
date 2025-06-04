import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { Settings as SettingsIcon, FileText, PenTool, Tag, User, Server, Building, Trash, RefreshCw } from 'lucide-react'
import { TemplateGallery } from '../../components/templates/TemplateGallery'
import { useAuth } from '../../lib/auth'
import { TemplateZonesTab } from './SettingsContent/TemplateZonesTab'
import { Branches } from './Branches'
import { UserProfile } from '../../components/profile/UserProfile'
import { SystemCleanup } from './SettingsContent/SystemCleanup'

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const { isAdmin } = useAuth()

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            الإعدادات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة إعدادات النظام وتخصيصه
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 flex items-center gap-1 px-1 overflow-x-auto hide-scrollbar pb-px">
          <TabsTrigger
            value="profile"
            className="flex items-center gap-2 py-3"
          >
            <User className="h-4 w-4" />
            <span>الملف الشخصي</span>
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="flex items-center gap-2 py-3"
          >
            <FileText className="h-4 w-4" />
            <span>قوالب الخطابات</span>
          </TabsTrigger>
          <TabsTrigger
            value="template-zones"
            className="flex items-center gap-2 py-3"
          >
            <PenTool className="h-4 w-4" />
            <span>مناطق الكتابة</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="branches"
              className="flex items-center gap-2 py-3"
            >
              <Building className="h-4 w-4" />
              <span>إدارة الفروع</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger
              value="system-cleanup"
              className="flex items-center gap-2 py-3"
            >
              <Trash className="h-4 w-4" />
              <span>تنظيف النظام</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <UserProfile />
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <TemplateGallery isAdmin={isAdmin} />
        </TabsContent>
        
        <TabsContent value="template-zones" className="space-y-4">
          <TemplateZonesTab />
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Branches />
        </TabsContent>

        <TabsContent value="system-cleanup" className="space-y-4">
          <SystemCleanup />
        </TabsContent>
      </Tabs>
    </div>
  )
}