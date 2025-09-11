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
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
}> = ({ title, value, icon: Icon, color, href, trend }) => {
  const content = (
    <div className={`stat-card group ${href ? 'hover:shadow-elevated cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
            {value}
          </p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-success-600' : 'text-danger-600'
            }`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${!trend.isPositive ? 'rotate-180' : ''}`} />
              <span className="font-medium">{trend.value}%</span>
              <span className="text-gray-500 ml-1">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl ${color} shadow-lg group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="h-8 w-8 text-white" />
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
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="section-header">
          <h1 className="section-title">
            Selamat datang, {user?.name}! 👋
          </h1>
          <p className="section-description">
            Berikut adalah ringkasan sistem arsip surat digital Anda hari ini.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Link href="/letters/incoming/create" className="btn btn-primary">
            <FileText className="h-4 w-4 mr-2" />
            Tambah Surat Masuk
          </Link>
          <Link href="/letters/outgoing/create" className="btn btn-success">
            <Send className="h-4 w-4 mr-2" />
            Tambah Surat Keluar
          </Link>
          <Link href="/calendar" className="btn btn-secondary">
            <Calendar className="h-4 w-4 mr-2" />
            Lihat Kalender
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Surat Masuk"
            value={incomingTotal}
            icon={FileText}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            href="/letters/incoming"
            trend={{
              value: 12,
              label: 'vs bulan lalu',
              isPositive: true
            }}
          />
          <StatCard
            title="Total Surat Keluar"
            value={outgoingTotal}
            icon={Send}
            color="bg-gradient-to-br from-success-500 to-success-600"
            href="/letters/outgoing"
            trend={{
              value: 8,
              label: 'vs bulan lalu',
              isPositive: true
            }}
          />
          <StatCard
            title="Acara Mendatang"
            value={upcomingEventsTotal}
            icon={Calendar}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            href="/calendar"
            trend={{
              value: 3,
              label: 'acara minggu ini',
              isPositive: true
            }}
          />
          <StatCard
            title="Notifikasi Baru"
            value={unreadNotifications}
            icon={Bell}
            color="bg-gradient-to-br from-danger-500 to-danger-600"
            href="/notifications"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Incoming Letters */}
          <div className="card animate-slide-in">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-transparent">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Surat Masuk Terbaru
                </h2>
                <Link 
                  href="/letters/incoming"
                  className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                >
                  Lihat semua →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {incomingLettersData?.letters?.length > 0 ? (
                <div className="space-y-4">
                  {incomingLettersData.letters.slice(0, 5).map((letter: any, index: number) => (
                    <div 
                      key={letter.id} 
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors animate-slide-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {letter.subject}
                        </p>
                        <p className="text-sm text-gray-500">
                          Dari: {letter.sender}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-400 mr-2">
                            {formatDate(letter.receivedDate)}
                          </span>
                          {letter.isInvitation && (
                            <span className="badge badge-primary">
                              Undangan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Belum ada surat masuk</p>
                  <Link href="/letters/incoming/create" className="btn btn-primary btn-sm">
                    Tambah Surat Masuk
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Outgoing Letters */}
          <div className="card animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-success-50 to-transparent">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Send className="h-5 w-5 mr-2 text-success-600" />
                  Surat Keluar Terbaru
                </h2>
                <Link 
                  href="/letters/outgoing"
                  className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                >
                  Lihat semua →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {outgoingLettersData?.letters?.length > 0 ? (
                <div className="space-y-4">
                  {outgoingLettersData.letters.slice(0, 5).map((letter: any, index: number) => (
                    <div 
                      key={letter.id} 
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors animate-slide-in"
                      style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
                    >
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-success-100 rounded-xl flex items-center justify-center">
                          <Send className="h-5 w-5 text-success-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {letter.subject}
                        </p>
                        <p className="text-sm text-gray-500">
                          Kepada: {letter.recipient}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-400 mr-2">
                            {formatDate(letter.sentDate)}
                          </span>
                          {letter.isInvitation && (
                            <span className="badge badge-success">
                              Undangan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Belum ada surat keluar</p>
                  <Link href="/letters/outgoing/create" className="btn btn-success btn-sm">
                    Tambah Surat Keluar
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEventsData?.events?.length > 0 && (
          <div className="card animate-slide-in" style={{ animationDelay: '0.4s' }}>
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-transparent">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                  Acara Mendatang
                </h2>
                <Link 
                  href="/calendar"
                  className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                >
                  Lihat kalender →
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {upcomingEventsData.events.slice(0, 3).map((event: any, index: number) => (
                  <div 
                    key={event.id} 
                    className="flex items-start space-x-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all duration-200 animate-slide-in"
                    style={{ animationDelay: `${index * 0.1 + 0.4}s` }}
                  >
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {event.title}
                      </p>
                      {event.location && (
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.location}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
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

        {/* Recent Activity Summary */}
        {(incomingLettersData?.letters?.length > 0 || outgoingLettersData?.letters?.length > 0) && (
          <div className="card animate-slide-in" style={{ animationDelay: '0.6s' }}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                Ringkasan Aktivitas
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{incomingTotal + outgoingTotal}</div>
                  <div className="text-sm text-gray-500">Total Dokumen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{upcomingEventsTotal}</div>
                  <div className="text-sm text-gray-500">Acara Mendatang</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-danger-600">{unreadNotifications}</div>
                  <div className="text-sm text-gray-500">Notifikasi Baru</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}