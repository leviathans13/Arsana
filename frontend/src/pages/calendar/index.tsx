import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  FileText,
  Send,
  PlusCircle,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarEvents } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import { formatDateTime } from '@/lib/utils';
import type { CalendarEvent } from '@/types';

// Plugins
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import idLocale from '@fullcalendar/core/locales/id';
import type {
  EventClickArg,
  EventContentArg,
  EventMountArg,
  DatesSetArg,
} from '@fullcalendar/core';

// SSR-safe import untuk komponen
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

type FilterType = 'all' | 'incoming' | 'outgoing';

function getInitialRange() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: startOfMonth.toISOString(),
    end: endOfMonth.toISOString(),
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  
  // State yang konsisten - tidak kondisional
  const [filter, setFilter] = useState<FilterType>('all');
  const [newEventDate, setNewEventDate] = useState<string | null>(null);
  const [range, setRange] = useState(getInitialRange);

  // Hook untuk data - selalu dipanggil
  const { data: calendarData } = useCalendarEvents({
    start: range.start,
    end: range.end,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  // Jika loading atau tidak authenticated, return early SETELAH semua hooks dipanggil
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Memuat kalender...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const allEvents: CalendarEvent[] = calendarData?.events || [];

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents;
    return allEvents.filter((e) => e.type === filter);
  }, [allEvents, filter]);

  // Mapping event ke format FullCalendar
  const mappedEvents = useMemo(
    () => {
      // Group events by date to handle multiple events on the same day
      const eventsByDate = new Map<string, CalendarEvent[]>();
      filteredEvents.forEach(event => {
        const dateKey = new Date(event.date).toDateString();
        if (!eventsByDate.has(dateKey)) {
          eventsByDate.set(dateKey, []);
        }
        eventsByDate.get(dateKey)!.push(event);
      });

      // Map events with time offsets for same-day events
      return filteredEvents.map((e, index) => {
        const isIncoming = e.type === 'incoming';
        const eventDate = new Date(e.date);
        const dateKey = eventDate.toDateString();
        const samedayEvents = eventsByDate.get(dateKey)!;
        const eventIndex = samedayEvents.indexOf(e);
        
        // Add small time offset for events on the same day (15 minutes apart)
        const adjustedDate = new Date(eventDate);
        if (samedayEvents.length > 1) {
          adjustedDate.setHours(9 + eventIndex, eventIndex * 15, 0, 0);
        } else {
          // For single events, set to 9:00 AM
          adjustedDate.setHours(9, 0, 0, 0);
        }
        
        return {
          id: String(e.id),
          title: e.title,
          start: adjustedDate.toISOString(),
          allDay: false,
          extendedProps: {
            original: e,
          },
          classNames: [
            'rounded-md',
            'border',
            'px-1.5',
            isIncoming
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-green-50 border-green-200 text-green-800',
          ],
        };
      });
    },
    [filteredEvents]
  );

  // Interaksi
  const onEventClick = useCallback((arg: EventClickArg) => {
    const data = arg.event.extendedProps?.original as CalendarEvent | undefined;
    if (!data) return;
    const path =
      data.type === 'incoming'
        ? `/letters/incoming/${data.id}`
        : `/letters/outgoing/${data.id}`;
    router.push(path);
  }, [router]);

  const onDateClick = useCallback((arg: DateClickArg) => {
    setNewEventDate(arg.dateStr);
  }, []);

  const eventDidMount = useCallback((arg: EventMountArg) => {
    const data = arg.event.extendedProps?.original as CalendarEvent | undefined;
    if (!data) return;
    const detail = [
      data.letterNumber ? `No: ${data.letterNumber}` : '',
      data.location ? `Lokasi: ${data.location}` : '',
      data.date ? `Waktu: ${formatDateTime(data.date)}` : '',
      data.type ? `Tipe: ${data.type === 'incoming' ? 'Surat Masuk' : 'Surat Keluar'}` : '',
      data.description ? `${data.description}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    arg.el.setAttribute('title', detail);
  }, []);

  const eventContent = useCallback((arg: EventContentArg) => {
    const data = arg.event.extendedProps?.original as CalendarEvent | undefined;
    if (!data) return <>{arg.timeText} {arg.event.title}</>;
    const isIncoming = data.type === 'incoming';
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-[11px] leading-none">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded ${
              isIncoming ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isIncoming ? 'Masuk' : 'Keluar'}
          </span>
          {data.letterNumber && <span className="text-gray-500">#{data.letterNumber}</span>}
        </div>
        <div className="text-[12px] font-medium truncate">{arg.event.title}</div>
        {data.location && (
          <div className="flex items-center gap-1 text-[11px] text-gray-600 truncate">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{data.location}</span>
          </div>
        )}
      </div>
    );
  }, []);

  // Fix untuk infinite loop - gunakan useCallback dengan dependency yang tepat
  const onDatesSet = useCallback((arg: DatesSetArg) => {
    // Hanya update jika range benar-benar berubah
    setRange(prev => {
      if (prev.start === arg.startStr && prev.end === arg.endStr) {
        return prev; // Tidak ada perubahan, return state lama
      }
      return { start: arg.startStr, end: arg.endStr };
    });
  }, []);

  const stats = useMemo(() => {
    const incoming = allEvents.filter((e) => e.type === 'incoming').length;
    const outgoing = allEvents.filter((e) => e.type === 'outgoing').length;
    return { incoming, outgoing, total: allEvents.length };
  }, [allEvents]);

  return (
    <Layout>
      {/* Inject CSS FullCalendar via CDN */}
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.15/index.global.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.15/index.global.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.15/index.global.min.css"
        />
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="bg-primary-100 p-3 rounded-lg mr-3">
                <CalendarIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kalender Acara</h1>
                <p className="text-gray-600 text-sm">
                  Lihat acara dari surat masuk dan surat keluar
                </p>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                <span className="px-2 py-1 text-xs text-gray-500 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Filter
                </span>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filter === 'all' ? 'bg-gray-800 text-white' : 'hover:bg-white text-gray-700'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilter('incoming')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filter === 'incoming' ? 'bg-blue-600 text-white' : 'hover:bg-white text-gray-700'
                  }`}
                >
                  Masuk
                </button>
                <button
                  onClick={() => setFilter('outgoing')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filter === 'outgoing' ? 'bg-green-600 text-white' : 'hover:bg-white text-gray-700'
                  }`}
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm p-3 md:p-5">
          <FullCalendar
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            locales={[idLocale]}
            locale="id"
            events={mappedEvents as any}
            eventClick={onEventClick}
            dateClick={onDateClick}
            eventDidMount={eventDidMount}
            eventContent={eventContent}
            datesSet={onDatesSet}
            selectable={true}
            dayMaxEventRows={false}
            moreLinkClick="popover"
            height="auto"
            aspectRatio={1.65}
            slotMinTime="06:00:00"
            slotMaxTime="21:00:00"
            expandRows={true}
            nowIndicator={true}
            displayEventTime={true}
            eventDisplay="block"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg mr-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.incoming}</div>
              <div className="text-sm text-gray-600">Acara dari Surat Masuk</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center">
            <div className="p-3 bg-green-50 rounded-lg mr-4">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.outgoing}</div>
              <div className="text-sm text-gray-600">Acara dari Surat Keluar</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg mr-4">
              <CalendarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Acara</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {newEventDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-primary-100 rounded-md mr-2">
                <PlusCircle className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Tambah acara pada {newEventDate}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Pilih jenis surat untuk membuat acara pada tanggal ini.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() =>
                  router.push(`/letters/incoming/create?date=${encodeURIComponent(newEventDate)}`)
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                <FileText className="h-4 w-4" />
                Surat Masuk
              </button>
              <button
                onClick={() =>
                  router.push(`/letters/outgoing/create?date=${encodeURIComponent(newEventDate)}`)
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
              >
                <Send className="h-4 w-4" />
                Surat Keluar
              </button>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => setNewEventDate(null)}
                className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}