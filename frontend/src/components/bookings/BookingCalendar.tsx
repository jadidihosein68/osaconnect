import { useMemo } from 'react';
import { Calendar as BigCalendar, Views, dateFnsLocalizer, SlotInfo, Event as RBCEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { Booking } from '../../lib/api';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
});

interface BookingCalendarProps {
  bookings: Booking[];
  onCreateForDate?: (startIso: string, endIso?: string) => void;
}

type CalendarEvent = RBCEvent & {
  bookingId: string;
  status: string;
  contact?: string;
  resource?: string;
  organizer?: string;
};

export function BookingCalendar({ bookings, onCreateForDate }: BookingCalendarProps) {
  const events: CalendarEvent[] = useMemo(
    () =>
      bookings.map((b) => ({
        title: b.title || 'Booking',
        start: new Date(b.start_time),
        end: new Date(b.end_time || b.start_time),
        bookingId: String(b.id),
        status: b.status,
        contact: b.contact?.full_name,
        resource: b.resource?.name,
        organizer: b.organizer_email,
        allDay: false,
      })),
    [bookings],
  );

  const handleSelectSlot = (slot: SlotInfo) => {
    if (!onCreateForDate) return;
    const startDate = slot.start instanceof Date ? slot.start : new Date();
    let endDate = slot.end instanceof Date ? slot.end : new Date(startDate.getTime() + 30 * 60 * 1000);
    if (endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    }
    onCreateForDate(startDate.toISOString(), endDate.toISOString());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Calendar (week/day/month)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <style>{`
          .rbc-day-bg:hover,
          .rbc-time-slot:hover,
          .rbc-date-cell:hover,
          .rbc-month-row:hover {
            background-color: #eef2ff !important;
            cursor: pointer;
          }
        `}</style>
        <div className="h-[650px] rounded border bg-white">
          <BigCalendar
            localizer={localizer}
            events={events}
            defaultView={Views.WEEK}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            popup
            selectable={!!onCreateForDate}
            onSelectSlot={handleSelectSlot}
            eventPropGetter={(event) => {
              let backgroundColor = '#4f46e5';
              if (event.status === 'confirmed') backgroundColor = '#16a34a';
              if (event.status === 'pending') backgroundColor = '#f97316';
              if (event.status === 'cancelled') backgroundColor = '#ef4444';
              return { style: { backgroundColor, borderRadius: 8, color: 'white', border: 'none' } };
            }}
            tooltipAccessor={(event) =>
              `${event.title}\n${event.organizer || ''}${event.resource ? ' • ' + event.resource : ''}\n${format(event.start as Date, 'PPpp')} - ${format(event.end as Date, 'PPpp')}`
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
