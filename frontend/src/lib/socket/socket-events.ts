import { socket } from './socket';
import { useNotificationStore } from '@/stores/notification.store';
import { usePostStore } from '@/stores/post.store';
import toast from 'react-hot-toast';

// To prevent toast spam
let lastToastTime = 0;
const TOAST_COOLDOWN = 3000; // 3 seconds

export const bindSocketEvents = () => {
  // Ensure strict cleanup before binding to avoid duplicates
  unbindSocketEvents();

  socket.on('notification:new', (notification) => {
    // 1. Update State
    useNotificationStore.getState().addNotification(notification);
    
    // 2. Throttled UI Alert
    const now = Date.now();
    if (now - lastToastTime > TOAST_COOLDOWN) {
      toast.success('New notification received', { id: 'new-notification' });
      lastToastTime = now;
    }
  });

  socket.on('workflow:status:changed', (payload: { postId: number; status: string; departmentId: number; assigneeId: number | null }) => {
    // Optimistically update the store if the post is in feed or current
    usePostStore.getState().optimisticUpdate(payload.postId, {
      status: payload.status as any,
      assigneeId: payload.assigneeId === null ? undefined : payload.assigneeId
    });
  });

  socket.on('timeline:new', (timelineEvent) => {
    // Optional: Could append to a timeline store if we had one active
    console.log('Timeline event:', timelineEvent);
  });

  socket.on('workflow:summary_generated', (payload: { postId: number; aiSummary: any }) => {
    const currentPost = usePostStore.getState().current;
    if (currentPost && currentPost.id === payload.postId) {
      usePostStore.getState().optimisticUpdate(payload.postId, {
        workflowMetrics: {
          ...currentPost.workflowMetrics,
          slaStatus: currentPost.workflowMetrics?.slaStatus || 'HEALTHY',
          totalTimeBlocked: currentPost.workflowMetrics?.totalTimeBlocked || 0,
          aiSummaryCache: payload.aiSummary
        }
      });
      toast.success('AI Summary Generated', { id: `summary-${payload.postId}` });
    }
  });
};

export const unbindSocketEvents = () => {
  socket.off('notification:new');
  socket.off('workflow:status:changed');
  socket.off('timeline:new');
  socket.off('workflow:summary_generated');
  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
};
