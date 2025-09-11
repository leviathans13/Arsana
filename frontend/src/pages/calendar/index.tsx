import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Calendar as CalendarIcon, MapPin, Clock, FileText, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarEvents, useUpcomingEvents } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import { formatDate, formatDateTime } from '@/lib/utils';
import { CalendarEvent } from '@/types';

const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const typeIcon = event.type === 'incoming' ? FileText : Send;
  const typeColor = event.type === 'incoming' ? 'text-blue-600' : 'text-green-600';
  const typeBg = event.type === 'incoming' ? 'bg-blue-50' : 'bg-green-50';
  
  return (
    <div className={`card p-4 border-l-4 ${event.type === 'incoming' ? 'border-blue-500' : 'border-green-500'}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 p-2 rounded-lg ${typeBg}`}>
          {React.createElement(typeIcon, { className: `h-4 w-4 ${typeColor}` })}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {event.title}
          </h3>
          <div className="mt-1 flex items-center text-xs text-gray-500">
            <span className="badge badge-primary mr-2">
              {event.letterNumber}
            </span>
            <span className={`badge ${event.type === 'incoming' ? 'badge-info' : 'badge-success'}`}>
              {event.type === 'incoming' ? 'Surat Masuk' : 'Surat Keluar'}
            </span>
          </div>
          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatDateTime(event.date)}
            </div>
            {event.location && (
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {event.location}
              </div>
            )}
          </div>
          {event.description && (
            <p className="mt-2 text-xs text-gray-600 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'upcoming'>('upcoming');

  // Get date range for current month
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const { data: calendarData } = useCalendarEvents({
    start: startOfMonth.toISOString(),
    end: endOfMonth.toISOString(),
  });

  const { data: upcomingData } = useUpcomingEvents({ limit: 20 });

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

  const events = viewType === 'month' ? calendarData?.events || [] : upcomingData?.events || [];

  // Group events by date for upcoming view
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = formatDate(event.date);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <CalendarIcon className="inline h-8 w-8 mr-2" />
              Kalender Acara
            </h1>
            <p className="text-gray-600">Lihat semua acara dari undangan masuk dan keluar</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewType('upcoming')}
              className={`btn text-sm ${viewType === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Acara Mendatang
            </button>
            <button
              onClick={() => setViewType('month')}
              className={`btn text-sm ${viewType === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Bulanan
            </button>
          </div>
        </div>

        {/* Month Navigation (only for month view) */}
        {viewType === 'month' && (
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateMonth('prev')}
                className="btn btn-secondary text-sm"
              >
                ← Bulan Sebelumnya
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className="btn btn-secondary text-sm"
              >
                Bulan Berikutnya →
              </button>
            </div>
          </div>
        )}

        {/* Events Display */}
        {events.length > 0 ? (
          <div className="space-y-6">
            {viewType === 'upcoming' ? (
              // Upcoming view - grouped by date
              Object.entries(groupedEvents).map(([date, dateEvents]) => (
                <div key={date} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    {date}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({dateEvents.length} acara)
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dateEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Month view - all events in grid
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Acara di {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({events.length} acara)
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <CalendarIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Tidak ada acara
            </h3>
            <p className="text-gray-500 mb-6">
              {viewType === 'month' 
                ? `Tidak ada acara terjadwal untuk ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : 'Belum ada acara yang akan datang'
              }
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/letters/incoming/create')}
                className="btn btn-primary"
              >
                Tambah Surat Masuk
              </button>
              <button
                onClick={() => router.push('/letters/outgoing/create')}
                className="btn btn-secondary"
              >
                Tambah Surat Keluar
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.type === 'incoming').length}
              </div>
              <div className="text-sm text-gray-600">Acara dari Surat Masuk</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => e.type === 'outgoing').length}
              </div>
              <div className="text-sm text-gray-600">Acara dari Surat Keluar</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {events.length}
              </div>
              <div className="text-sm text-gray-600">Total Acara</div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}