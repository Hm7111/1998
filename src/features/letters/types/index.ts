// أنواع بيانات للخطابات
export interface LetterContent {
  body?: string;
  subject?: string;
  to?: string;
  date?: string;
  number?: string;
  verification_url?: string;
  category?: string;
  notes?: string;
  templateId?: string;
  [key: string]: any;
}

interface LetterDraft {
  id?: string;
  user_id: string;
  template_id: string;
  template_snapshot?: any;
  content: LetterContent;
  status: 'draft' | 'completed';
  number?: number;
  year?: number;
  creator_name?: string;
  sync_status?: 'pending' | 'synced' | 'failed';
  local_id?: string;
  verification_url?: string;
}

// أنواع للمحرر
export interface EditorConfig {
  fontSize: string;
  lineHeight: number;
  fontFamily: string;
}

export interface EditorState {
  activeStep?: number;
  previewMode?: boolean;
  showGuides?: boolean;
  editorStyle: 'inside' | 'outside';
  previewScale: 'fit' | 'actual';
  livePreview?: boolean;
  showQRInEditor?: boolean;
  showTemplateSelector: boolean;
  editorType: 'tinymce';
  showEditorControls?: boolean;
  autosaveEnabled?: boolean;
}

// أنواع للتصدير
interface ExportOptions {
  withTemplate: boolean;
  action: 'print' | 'export';
}
;
