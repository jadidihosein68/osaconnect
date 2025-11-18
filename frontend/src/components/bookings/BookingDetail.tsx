import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, Calendar, Send } from 'lucide-react';

interface BookingDetailProps {
  bookingId: string | null;
  onBack: () => void;
}

export function BookingDetail({ bookingId, onBack }: BookingDetailProps) {
  const [isEditing, setIsEditing] = useState(!bookingId);

  const booking = bookingId ? {
    id: bookingId,
    contact: 'John Smith',
    contactId: '1',
    service: 'Consultation',
    date: '2024-11-18',
    time: '14:00',
    status: 'confirmed',
    eventId: 'evt_abc123',
    notes: 'Client requested afternoon slot. Prefers video call.',
    createdDate: 'Nov 10, 2024',
    notificationsSent: [
      { type: 'confirmation', channel: 'WhatsApp', timestamp: 'Nov 10, 2024 3:45 PM' },
      { type: 'reminder', channel: 'Email', timestamp: 'Nov 17, 2024 9:00 AM' },
    ]
  } : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-gray-900 mb-1">
              {bookingId ? 'Booking Details' : 'Create New Booking'}
            </h1>
            <p className="text-gray-600">
              {bookingId ? `Event ID: ${booking?.eventId}` : 'Fill in the details below'}
            </p>
          </div>
        </div>
        {bookingId && (
          <div className="flex gap-2">
            {isEditing ? (
              <Button onClick={() => setIsEditing(false)}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Booking
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select defaultValue={booking?.contactId || ''} disabled={!isEditing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">John Smith</SelectItem>
                    <SelectItem value="2">Sarah Johnson</SelectItem>
                    <SelectItem value="3">Mike Brown</SelectItem>
                    <SelectItem value="4">Emily Davis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Service</Label>
                <Select defaultValue={booking?.service || ''} disabled={!isEditing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Initial Meeting">Initial Meeting</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    defaultValue={booking?.date || ''}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    defaultValue={booking?.time || ''}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  defaultValue={booking?.notes || ''}
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Add any special notes or requirements..."
                />
              </div>

              {!bookingId && (
                <Button className="w-full" size="lg">
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Booking
                </Button>
              )}
            </CardContent>
          </Card>

          {bookingId && booking && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Reschedule or Cancel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>New Date</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>New Time</Label>
                      <Input type="time" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Reschedule Booking
                    </Button>
                    <Button variant="destructive" className="flex-1">
                      Cancel Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {booking.notificationsSent.map((notification, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Send className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-gray-900 capitalize">{notification.type}</div>
                          <div className="text-gray-600">
                            {notification.channel} • {notification.timestamp}
                          </div>
                        </div>
                        <Badge className="bg-green-500 text-white">Sent</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {bookingId && booking && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={`${
                    booking.status === 'confirmed' ? 'bg-green-500' :
                    booking.status === 'pending' ? 'bg-orange-500' :
                    booking.status === 'rescheduled' ? 'bg-blue-500' :
                    'bg-red-500'
                  } text-white text-lg px-4 py-2`}>
                    {booking.status.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    Add to Calendar
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookingId && booking ? (
                <>
                  <div>
                    <div className="text-gray-600 mb-1">Event ID</div>
                    <div className="text-gray-900">{booking.eventId}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Created Date</div>
                    <div className="text-gray-900">{booking.createdDate}</div>
                  </div>
                </>
              ) : (
                <div className="text-gray-600">
                  Complete the form to create a new booking
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
