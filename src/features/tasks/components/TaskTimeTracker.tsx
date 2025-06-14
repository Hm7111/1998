import { useState, useEffect, useRef } from 'react';
import { Clock, PlayCircle, PauseCircle, StopCircle, Save } from 'lucide-react';
import { formatDuration } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '../../../hooks/useToast';

interface TaskTimeTrackerProps {
  taskId: string;
  onSaveTime?: (taskId: string, seconds: number, notes?: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

/**
 * مكون لتتبع الوقت المستغرق في المهمة
 * يتيح تسجيل الوقت المستغرق وحفظه للمهمة
 */
export function TaskTimeTracker({ taskId, onSaveTime, isLoading = false, className = '' }: TaskTimeTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // بالثواني
  const [notes, setNotes] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const { toast } = useToast();
  
  // استخدام ref للتايمر لضمان عدم تسرب الذاكرة
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // بدء تتبع الوقت
  const startTracking = () => {
    if (!isTracking) {
      setIsTracking(true);
      startTimeRef.current = Date.now() - (elapsedTime * 1000);
      
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
    }
  };
  
  // إيقاف تتبع الوقت مؤقتًا
  const pauseTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  // إيقاف تتبع الوقت وإظهار نموذج الحفظ
  const stopTracking = () => {
    pauseTracking();
    setShowSaveForm(true);
  };
  
  // حفظ الوقت المسجل
  const saveTrackedTime = async () => {
    if (!onSaveTime) return;
    
    try {
      await onSaveTime(taskId, elapsedTime, notes);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ الوقت المسجل بنجاح',
        type: 'success'
      });
      
      // إعادة تعيين الحالة
      setElapsedTime(0);
      setNotes('');
      setShowSaveForm(false);
      
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ الوقت المسجل',
        type: 'error'
      });
    }
  };
  
  // تنسيق الوقت المنقضي
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // تنظيف التايمر عند إزالة المكون
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  return (
    <div className={`border dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        تتبع الوقت المستغرق
      </h3>
      
      <div className="text-center">
        <div className="text-3xl font-mono font-bold mb-4">
          {formatElapsedTime(elapsedTime)}
        </div>
        
        <div className="flex justify-center gap-2">
          {!isTracking ? (
            <button
              onClick={startTracking}
              className="p-2 rounded-full bg-primary text-white"
              title="بدء"
              disabled={isLoading}
            >
              <PlayCircle className="h-8 w-8" />
            </button>
          ) : (
            <button
              onClick={pauseTracking}
              className="p-2 rounded-full bg-amber-500 text-white"
              title="إيقاف مؤقت"
              disabled={isLoading}
            >
              <PauseCircle className="h-8 w-8" />
            </button>
          )}
          
          {(isTracking || elapsedTime > 0) && (
            <button
              onClick={stopTracking}
              className="p-2 rounded-full bg-red-500 text-white"
              title="إيقاف وحفظ"
              disabled={isLoading}
            >
              <StopCircle className="h-8 w-8" />
            </button>
          )}
        </div>
      </div>
      
      {/* نموذج حفظ الوقت المسجل */}
      {showSaveForm && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <p className="text-sm mb-2">الوقت المستغرق: {formatDuration({ seconds: elapsedTime }, { locale: ar })}</p>
          
          <div className="mb-3">
            <label htmlFor="time-notes" className="block text-sm font-medium mb-1">ملاحظات (اختياري)</label>
            <textarea
              id="time-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border dark:border-gray-700 rounded-lg resize-none h-20"
              placeholder="أضف ملاحظات حول ما تم إنجازه خلال هذا الوقت"
            ></textarea>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSaveForm(false)}
              className="px-3 py-1.5 border dark:border-gray-700 rounded-lg text-sm"
              disabled={isLoading}
            >
              إلغاء
            </button>
            
            <button
              onClick={saveTrackedTime}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm flex items-center gap-1.5"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>جارِ الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>حفظ الوقت المسجل</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}