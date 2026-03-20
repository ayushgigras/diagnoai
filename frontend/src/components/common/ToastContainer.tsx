import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useToastStore from '../../store/useToastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          let bg = 'bg-slate-800 text-white';
          let border = 'border-slate-700';
          let Icon = Info;
          
          if (toast.type === 'success') {
            bg = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
            border = 'border-emerald-200 dark:border-emerald-900';
            Icon = CheckCircle2;
          } else if (toast.type === 'error') {
            bg = 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300';
            border = 'border-red-200 dark:border-red-900';
            Icon = AlertCircle;
          } else if (toast.type === 'info') {
            bg = 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
            border = 'border-blue-200 dark:border-blue-900';
            Icon = Info;
          }

          return (
            <motion.div 
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`flex items-start justify-between p-4 rounded-lg shadow-lg min-w-[300px] max-w-sm border pointer-events-auto ${bg} ${border}`}
            >
              <div className="flex items-start gap-3 text-sm font-medium">
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{toast.message}</span>
              </div>
              <button 
                onClick={() => removeToast(toast.id)} 
                className="text-current opacity-70 hover:opacity-100 p-1 transition-opacity ml-4 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
