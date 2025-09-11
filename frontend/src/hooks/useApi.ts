import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api';
import { 
  IncomingLetter, 
  OutgoingLetter, 
  PaginationResponse,
  CreateIncomingLetterRequest,
  CreateOutgoingLetterRequest
} from '@/types';
import { createFormData } from '@/lib/utils';

// Incoming Letters Hooks
export const useIncomingLetters = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) => {
  return useQuery(
    ['incomingLetters', params],
    () => apiClient.getIncomingLetters(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

export const useIncomingLetter = (id: string) => {
  return useQuery(
    ['incomingLetter', id],
    () => apiClient.getIncomingLetterById(id),
    {
      enabled: !!id,
    }
  );
};

export const useCreateIncomingLetter = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: CreateIncomingLetterRequest) => {
      const formData = createFormData(data);
      return apiClient.createIncomingLetter(formData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['incomingLetters']);
        toast.success('Incoming letter created successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to create incoming letter';
        toast.error(message);
      },
    }
  );
};

export const useUpdateIncomingLetter = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, data }: { id: string; data: Partial<CreateIncomingLetterRequest> }) => {
      const formData = createFormData(data);
      return apiClient.updateIncomingLetter(id, formData);
    },
    {
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries(['incomingLetters']);
        queryClient.invalidateQueries(['incomingLetter', id]);
        toast.success('Incoming letter updated successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to update incoming letter';
        toast.error(message);
      },
    }
  );
};

export const useDeleteIncomingLetter = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: string) => apiClient.deleteIncomingLetter(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['incomingLetters']);
        toast.success('Incoming letter deleted successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to delete incoming letter';
        toast.error(message);
      },
    }
  );
};

// Outgoing Letters Hooks
export const useOutgoingLetters = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) => {
  return useQuery(
    ['outgoingLetters', params],
    () => apiClient.getOutgoingLetters(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

export const useOutgoingLetter = (id: string) => {
  return useQuery(
    ['outgoingLetter', id],
    () => apiClient.getOutgoingLetterById(id),
    {
      enabled: !!id,
    }
  );
};

export const useCreateOutgoingLetter = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: CreateOutgoingLetterRequest) => {
      const formData = createFormData(data);
      return apiClient.createOutgoingLetter(formData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['outgoingLetters']);
        toast.success('Outgoing letter created successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to create outgoing letter';
        toast.error(message);
      },
    }
  );
};

export const useUpdateOutgoingLetter = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, data }: { id: string; data: Partial<CreateOutgoingLetterRequest> }) => {
      const formData = createFormData(data);
      return apiClient.updateOutgoingLetter(id, formData);
    },
    {
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries(['outgoingLetters']);
        queryClient.invalidateQueries(['outgoingLetter', id]);
        toast.success('Outgoing letter updated successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to update outgoing letter';
        toast.error(message);
      },
    }
  );
};

export const useDeleteOutgoingLetter = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: string) => apiClient.deleteOutgoingLetter(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['outgoingLetters']);
        toast.success('Outgoing letter deleted successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to delete outgoing letter';
        toast.error(message);
      },
    }
  );
};

// Notifications Hooks
export const useNotifications = (params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) => {
  return useQuery(
    ['notifications', params],
    () => apiClient.getNotifications(params),
    {
      refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
      staleTime: 15000, // 15 seconds
    }
  );
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: string) => apiClient.markNotificationAsRead(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
      },
    }
  );
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    () => apiClient.markAllNotificationsAsRead(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
        toast.success('All notifications marked as read');
      },
    }
  );
};

// Calendar Hooks
export const useCalendarEvents = (params?: { start?: string; end?: string }) => {
  return useQuery(
    ['calendarEvents', params],
    () => apiClient.getCalendarEvents(params),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

export const useUpcomingEvents = (params?: { limit?: number }) => {
  return useQuery(
    ['upcomingEvents', params],
    () => apiClient.getUpcomingEvents(params),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
};