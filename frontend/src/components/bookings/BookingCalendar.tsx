import { useMemo } from 'react';
import { Calendar as BigCalendar, Views, dateFnsLocalizer, SlotInfo, Event as RBCEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './BookingCalendar.css';
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
      <CardContent className="px-6">
        <div className="h-[450px] bg-white rounded-b-lg overflow-hidden">
          <BigCalendar
            style={{ height: '100%' }}
            localizer={localizer}
            events={events}
            defaultView={Views.WEEK}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            step={60}
            timeslots={1}
            popup
            selectable={!!onCreateForDate}
            onSelectSlot={handleSelectSlot}
            scrollToTime={new Date()}
            eventPropGetter={(event) => {
              let backgroundColor = '#039be5'; // Google Calendar Blue
              if (event.status === 'confirmed') backgroundColor = '#0b8043'; // Google Green
              if (event.status === 'pending') backgroundColor = '#f9ab00'; // Google Yellow
              if (event.status === 'cancelled') backgroundColor = '#d93025'; // Google Red
              return { style: { backgroundColor, color: 'white' } };
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
