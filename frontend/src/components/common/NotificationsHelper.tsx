import { useEffect, useState } from 'react';
import useAuthStore from '../../store/useAuthStore';
import { X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationsHelper() {
  const { token, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<{id: number, message: string, type: 'success'|'error'}[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Hardcode backend port since Vite proxies might not support standard WS setup seamlessly in basic configs
    const wsUrl = `ws://127.0.0.1:8000/api/ws/notifications?token=${token}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotif = {
            id: Date.now(),
            message: data.details || data.status,
            type: data.status === 'completed' ? 'success' as const : 'error' as const
        };
        setNotifications(prev => [...prev, newNotif]);
        
        // Auto-remove after 5s
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
        }, 5000);
      } catch (err) {
        console.error("Invalid WS message", event.data);
      }
    };

    ws.onclose = () => console.log('WS disconnected');

    return () => {
      ws.close();
    };
  }, [isAuthenticated, token]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div 
            key={n.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-center justify-between p-4 rounded-lg shadow-lg min-w-[300px] border pointer-events-auto ${
              n.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900 dark:text-emerald-300' 
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/90 dark:border-red-900 dark:text-red-300'
            }`}
          >
            <div className="flex items-center gap-3 text-sm font-medium">
              <div className={`p-1.5 rounded-full ${n.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                <Bell className="w-4 h-4" />
              </div>
              {n.message}
            </div>
            <button 
              onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} 
              className="text-current opacity-70 hover:opacity-100 p-1 transition-opacity ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
