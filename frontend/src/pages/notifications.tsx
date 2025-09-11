import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import { Bell, Check, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { NotificationType } from '@/types';

const NotificationIcon: React.FC<{ type: NotificationType; isRead: boolean }> = ({ type, isRead }) => {
  const baseClasses = `h-8 w-8 rounded-full flex items-center justify-center ${isRead ? 'opacity-60' : ''}`;
  
  switch (type) {
    case 'SUCCESS':
      return (
        <div className={`${baseClasses} bg-success-100`}>
          <CheckCircle className={`h-4 w-4 ${isRead ? 'text-success-400' : 'text-success-600'}`} />
        </div>
      );
    case 'WARNING':
      return (
        <div className={`${baseClasses} bg-warning-100`}>
          <AlertTriangle className={`h-4 w-4 ${isRead ? 'text-warning-400' : 'text-warning-600'}`} />
        </div>
      );
    case 'ERROR':
      return (
        <div className={`${baseClasses} bg-danger-100`}>
          <XCircle className={`h-4 w-4 ${isRead ? 'text-danger-400' : 'text-danger-600'}`} />
        </div>
      );
    default:
      return (
        <div className={`${baseClasses} bg-primary-100`}>
          <Info className={`h-4 w-4 ${isRead ? 'text-primary-400' : 'text-primary-600'}`} />
        </div>
      );
  }
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);
  
  const { data: notificationsData, refetch } = useNotifications({
    page: currentPage,
    limit: 10,
    unreadOnly: showUnreadOnly,
  });
  
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination;
  const unreadCount = notificationsData?.unreadCount || 0;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="section-header">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="section-title flex items-center">
                <Bell className="h-8 w-8 mr-3 text-primary-600" />
                Notifikasi
              </h1>
              <p className="section-description">
                {unreadCount > 0 ? `Anda memiliki ${unreadCount} notifikasi yang belum dibaca` : 'Semua notifikasi telah dibaca'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isLoading}
                className="btn btn-primary btn-sm"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {markAllAsReadMutation.isLoading ? 'Memproses...' : 'Tandai Semua'}
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => {
                setShowUnreadOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Tampilkan hanya yang belum dibaca</span>
          </label>
        </div>

        {/* Notifications List */}
        <div className="card">
          {notifications.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification: any, index: number) => (
                <div
                  key={notification.id}
                  className={`p-6 transition-all duration-200 hover:bg-gray-50 animate-slide-in ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start space-x-4">
                    <NotificationIcon type={notification.type} isRead={notification.isRead} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isLoading}
                            className="ml-4 p-1 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Tandai sebagai dibaca"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {showUnreadOnly ? 'Tidak ada notifikasi yang belum dibaca' : 'Tidak ada notifikasi'}
              </h3>
              <p className="text-gray-500">
                {showUnreadOnly 
                  ? 'Semua notifikasi Anda telah dibaca'
                  : 'Belum ada notifikasi untuk ditampilkan'
                }
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Menampilkan {((pagination.current - 1) * pagination.limit) + 1} - {Math.min(pagination.current * pagination.limit, pagination.total)} dari {pagination.total} notifikasi
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-secondary btn-sm"
              >
                Sebelumnya
              </button>
              <span className="flex items-center px-3 py-1 text-sm text-gray-700">
                Halaman {pagination.current} dari {pagination.pages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.pages}
                className="btn btn-secondary btn-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}