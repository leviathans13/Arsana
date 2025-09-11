import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { 
  useIncomingLetters, 
  useOutgoingLetters, 
  useUpcomingEvents,
  useNotifications 
} from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import { FileText, Send, Calendar, Bell, TrendingUp, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  href?: string;
}> = ({ title, value, icon: Icon, color, href }) => {
  const content = (
    <div className={`card p-6 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const { data: incomingLettersData } = useIncomingLetters({ limit: 5 });
  const { data: outgoingLettersData } = useOutgoingLetters({ limit: 5 });
  const { data: upcomingEventsData } = useUpcomingEvents({ limit: 5 });
  const { data: notificationsData } = useNotifications({ limit: 5 });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const incomingTotal = incomingLettersData?.pagination?.total || 0;
  const outgoingTotal = outgoingLettersData?.pagination?.total || 0;
  const upcomingEventsTotal = upcomingEventsData?.events?.length || 0;
  const unreadNotifications = notificationsData?.unreadCount || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Selamat datang, {user?.name}!
          </h1>
          <p className="text-gray-600">
            Berikut adalah ringkasan sistem arsip surat digital Anda.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Surat Masuk"
            value={incomingTotal}
            icon={FileText}
            color="bg-blue-500"
            href="/letters/incoming"
          />
          <StatCard
            title="Surat Keluar"
            value={outgoingTotal}
            icon={Send}
            color="bg-green-500"
            href="/letters/outgoing"
          />
          <StatCard
            title="Acara Mendatang"
            value={upcomingEventsTotal}
            icon={Calendar}
            color="bg-purple-500"
            href="/calendar"
          />
          <StatCard
            title="Notifikasi"
            value={unreadNotifications}
            icon={Bell}
            color="bg-red-500"
            href="/notifications"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Incoming Letters */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Surat Masuk Terbaru
                </h2>
                <Link 
                  href="/letters/incoming"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Lihat semua
                </Link>
              </div>
            </div>
            <div className="p-6">
              {incomingLettersData?.letters?.length > 0 ? (
                <div className="space-y-4">
                  {incomingLettersData.letters.slice(0, 5).map((letter: any) => (
                    <div key={letter.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {letter.subject}
                        </p>
                        <p className="text-sm text-gray-500">
                          Dari: {letter.sender}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(letter.receivedDate)}
                        </p>
                      </div>
                      {letter.isInvitation && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Undangan
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Belum ada surat masuk
                </p>
              )}
            </div>
          </div>

          {/* Recent Outgoing Letters */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Surat Keluar Terbaru
                </h2>
                <Link 
                  href="/letters/outgoing"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Lihat semua
                </Link>
              </div>
            </div>
            <div className="p-6">
              {outgoingLettersData?.letters?.length > 0 ? (
                <div className="space-y-4">
                  {outgoingLettersData.letters.slice(0, 5).map((letter: any) => (
                    <div key={letter.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Send className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {letter.subject}
                        </p>
                        <p className="text-sm text-gray-500">
                          Kepada: {letter.recipient}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(letter.sentDate)}
                        </p>
                      </div>
                      {letter.isInvitation && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Undangan
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Belum ada surat keluar
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEventsData?.events?.length > 0 && (
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Acara Mendatang
                </h2>
                <Link 
                  href="/calendar"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Lihat kalender
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {upcomingEventsData.events.slice(0, 3).map((event: any) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {event.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {event.location && `Lokasi: ${event.location}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(event.date)}
                      </p>
                    </div>
                    <span className={`badge ${
                      event.type === 'incoming' ? 'badge-primary' : 'badge-success'
                    }`}>
                      {event.type === 'incoming' ? 'Masuk' : 'Keluar'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}