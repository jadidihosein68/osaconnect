We need to develop API's below : 

1- get all booking API : 

API list : 

curl --request GET \
  --url 'api/v1/bookings?take=100' \
  --header 'Authorization: <authorization>' \
  --header 'cal-api-version: 2024-08-13'


header : 
Authorization 
Value must be Bearer <token> where <token> is api key prefixed with cal_ or managed user access token

Query : 

field name: attendeeEmail 
field type: string
logic : Filter bookings by the attendee's email address.

enter attendeeEmail
field name:attendeeName
field type:string
logic :Filter bookings by the attendee's name.

enter attendeeName
field name: bookingUid
field type:string
logic :Filter bookings by the booking Uid.

enter bookingUid
field name:eventTypeIds
field type:string
logic :Filter bookings by event type ids belonging to the user. Event type ids must be separated by a comma.

enter eventTypeIds
field name: eventTypeId
field type:string
logic :Filter bookings by event type id belonging to the user.

enter eventTypeId
field name: teamsIds
field type:string
logic :Filter bookings by team ids that user is part of. Team ids must be separated by a comma.

enter teamsIds
field name:teamId
field type:string
logic :Filter bookings by team id that user is part of

enter teamId
field name:afterStart
field type:string
logic :Filter bookings with start after this date string.

enter afterStart
field name: beforeEnd
field type:string
logic :Filter bookings with end before this date string.

enter beforeEnd
field name: afterCreatedAt
field type:string
logic :Filter bookings that have been created after this date string.

enter afterCreatedAt
field name: beforeCreatedAt
field type:string
logic :Filter bookings that have been created before this date string.

enter beforeCreatedAt
field name: afterUpdatedAt
field type:string
logic :Filter bookings that have been updated after this date string.

enter afterUpdatedAt
field name: beforeUpdatedAt
field type:string
logic :Filter bookings that have been updated before this date string.

enter beforeUpdatedAt
field name: sortStart
field type:enum<string>
logic :sults by their start time in ascending or descending order.


select sortStart
field name: sortEnd
field type:enum<string>
logic :Sort results by their end time in ascending or descending order.


select sortEnd
field name: sortCreated
field type:enum<string>
logic :Sort results by their creation time (when booking was made) in ascending or descending order.


select sortCreated
field name: sortUpdatedAt
field type:enum<string>
logic :Sort results by their updated time (for example when booking status changes) in ascending or descending order.


field name:take
field type:number
logic :The number of items to return

field name: skip
field type:number
logic :The number of items to skip

API respond : 

{
  "status": "success",
  "data": [
    {
      "id": 123,
      "uid": "booking_uid_123",
      "title": "Consultation",
      "description": "Learn how to integrate scheduling into marketplace.",
      "hosts": [
        {
          "id": 1,
          "name": "Jane Doe",
          "email": "jane100@example.com",
          "username": "jane100",
          "timeZone": "America/Los_Angeles"
        }
      ],
      "status": "accepted",
      "start": "2024-08-13T15:30:00Z",
      "end": "2024-08-13T16:30:00Z",
      "duration": 60,
      "eventTypeId": 50,
      "eventType": {
        "id": 1,
        "slug": "some-event"
      },
      "location": "https://example.com/meeting",
      "absentHost": true,
      "createdAt": "2024-08-13T15:30:00Z",
      "updatedAt": "2024-08-13T15:30:00Z",
      "attendees": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "timeZone": "America/New_York",
          "absent": false,
          "language": "en",
          "phoneNumber": "+1234567890"
        }
      ],
      "bookingFieldsResponses": {
        "customField": "customValue"
      },
      "cancellationReason": "User requested cancellation",
      "cancelledByEmail": "canceller@example.com",
      "reschedulingReason": "User rescheduled the event",
      "rescheduledByEmail": "rescheduler@example.com",
      "rescheduledFromUid": "previous_uid_123",
      "rescheduledToUid": "new_uid_456",
      "meetingUrl": "https://example.com/recurring-meeting",
      "metadata": {
        "key": "value"
      },
      "icsUid": "ics_uid_123",
      "guests": [
        "guest1@example.com",
        "guest2@example.com"
      ]
    }
  ],
  "error": {}
}



////////////////////////////////////////////////

2- Create a booking
POST api/v1/bookings is used to create regular bookings, recurring bookings and instant bookings.


 there are 2 ways to book an event type belonging to an individual user:

Provide eventTypeId in the request body.
Provide eventTypeSlug and username and optionally organizationSlug if the user with the username is within an organization.
And 2 ways to book and event type belonging to a team:

Provide eventTypeId in the request body.
Provide eventTypeSlug and teamSlug and optionally organizationSlug if the team with the teamSlug is within an organization.
If you are creating a seated booking for an event type with ‘show attendees’ disabled, then to retrieve attendees in the response either set ‘show attendees’ to true on event type level or you have to provide an authentication method of event type owner, host, team admin or owner or org admin or owner.

For event types that have SMS reminders workflow, you need to pass the attendee’s phone number in the request body via attendee.phoneNumber (e.g., “+19876543210” in international format). This is an optional field, but becomes required when SMS reminders are enabled for the event type. For the complete attendee object structure,


curl --request POST \
  --url /v2/bookings \
  --header 'Content-Type: application/json' \
  --header 'cal-api-version: 2024-08-13' \
  --data '
{
  "start": "2024-08-13T09:00:00Z",
  "attendee": {
    "language": "en"
  },
  "bookingFieldsResponses": {
    "customField": "customValue"
  },
  "eventTypeId": 123,
  "eventTypeSlug": "my-event-type",
  "username": "john-doe",
  "teamSlug": "john-doe",
  "organizationSlug": "acme-corp",
  "guests": [
    "guest1@example.com",
    "guest2@example.com"
  ],
  "meetingUrl": "https://example.com/meeting",
  "location": {
    "type": "address"
  },
  "metadata": {
    "key": "value"
  },
  "lengthInMinutes": 30,
  "routing": {
    "responseId": 123,
    "teamMemberIds": [
      101,
      102
    ]
  },
  "emailVerificationCode": "123456"
}




body : 

field name : start
field type : string
required
The start time of the booking in ISO 8601 format in UTC timezone.


field name : attendee
field type : object
required
The attendee's details.

field name :  attendee.name
field type :  string
required
The name of the attendee.


field name : attendee.timeZone
field type : string
required
The time zone of the attendee.


field name : attendee.email
field type : string
The email of the attendee.


field name : attendee.phoneNumber
field type : string
The phone number of the attendee in international format.


field name : attendee.language
field type : enum<string>
The preferred language of the attendee. Used for booking confirmation.


field name :bookingFieldsResponses
field type :object
Booking field responses consisting of an object with booking field slug as keys and user response as values for custom booking fields added by you.


field name :eventTypeId
field type :number
The ID of the event type that is booked. Required unless eventTypeSlug and username are provided as an alternative to identifying the event type.


field name :eventTypeSlug
field type :string
The slug of the event type. Required along with username / teamSlug and optionally organizationSlug if eventTypeId is not provided.


field name :username
field type :string
The username of the event owner. Required along with eventTypeSlug and optionally organizationSlug if eventTypeId is not provided.


field name :teamSlug
field type :string
Team slug for team that owns event type for which slots are fetched. Required along with eventTypeSlug and optionally organizationSlug if the team is part of organization


field name :organizationSlug
field type :string
The organization slug. Optional, only used when booking with eventTypeSlug + username or eventTypeSlug + teamSlug.


field name :guests
field type :string[]
An optional list of guest emails attending the event.



field name :meetingUrl
field type :string
deprecated
Deprecated - use 'location' instead. Meeting URL just for this booking. Displayed in email and calendar event. If not provided then cal video link will be generated.


field name :location
field type :object

One of the event type locations. If instead of passing one of the location objects as required by schema you are still passing a string please use an object.

field name :location.type
field type :string
required
only allowed value for type is address - it refers to address defined by the organizer.



field name :metadata
field type :object
You can store any additional data you want here. Metadata must have at most 50 keys, each key up to 40 characters, and string values up to 500 characters.


field name :lengthInMinutes
field type :number
If it is an event type that has multiple possible lengths that attendee can pick from, you can pass the desired booking length here.
If not provided then event type default length will be used for the booking.


field name :routing
field type :object

Routing information from routing forms that determined the booking assignment. Both responseId and teamMemberIds are required if provided.

field name :routing.teamMemberIds
field type :number[]
required
Array of team member IDs that were routed to handle this booking.



field name :routing.queuedResponseId

field type :string
The ID of the queued form response. Only present if the form response was queued.


field name :routing.responseId
field type :number
The ID of the routing form response.


field name :routing.teamMemberEmail
field type :string
The email of the team member assigned to handle this booking.


field name :routing.skipContactOwner
field type :boolean
Whether to skip contact owner assignment from CRM integration.



field name :routing.crmAppSlug
field type :string
The CRM application slug for integration.


field name :routing.crmOwnerRecordType
field type :string
The CRM owner record type for contact assignment.


field name :emailVerificationCode
field type :string
Email verification code required when event type has email verification enabled.

respond Object : 


{
  "status": "success",
  "data": {
    "id": 123,
    "uid": "booking_uid_123",
    "title": "Consultation",
    "description": "Learn how to integrate scheduling into marketplace.",
    "hosts": [
      {
        "id": 1,
        "name": "Jane Doe",
        "email": "jane100@example.com",
        "username": "jane100",
        "timeZone": "America/Los_Angeles"
      }
    ],
    "status": "accepted",
    "start": "2024-08-13T15:30:00Z",
    "end": "2024-08-13T16:30:00Z",
    "duration": 60,
    "eventTypeId": 50,
    "eventType": {
      "id": 1,
      "slug": "some-event"
    },
    "location": "https://example.com/meeting",
    "absentHost": true,
    "createdAt": "2024-08-13T15:30:00Z",
    "updatedAt": "2024-08-13T15:30:00Z",
    "attendees": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "timeZone": "America/New_York",
        "absent": false,
        "language": "en",
        "phoneNumber": "+1234567890"
      }
    ],
    "bookingFieldsResponses": {
      "customField": "customValue"
    },
    "cancellationReason": "User requested cancellation",
    "cancelledByEmail": "canceller@example.com",
    "reschedulingReason": "User rescheduled the event",
    "rescheduledByEmail": "rescheduler@example.com",
    "rescheduledFromUid": "previous_uid_123",
    "rescheduledToUid": "new_uid_456",
    "meetingUrl": "https://example.com/recurring-meeting",
    "metadata": {
      "key": "value"
    },
    "rating": 4,
    "icsUid": "ics_uid_123",
    "guests": [
      "guest1@example.com",
      "guest2@example.com"
    ]
  }
}



/////////////////////////////////



3- Reschedule a booking 

curl --request POST \
  --url api/v1/bookings/{bookingUid}/reschedule \
  --header 'Content-Type: application/json' \
  --header 'cal-api-version: 2024-08-13' \
  --data '
{
  "start": "2024-08-13T10:00:00Z",
  "rescheduledBy": "<string>",
  "reschedulingReason": "User requested reschedule",
  "emailVerificationCode": "123456"
}
'



Body : 


Path Parameters
field name :​bookingUid
field type :string 
required


field name :start
field type :string
required
Start time in ISO 8601 format for the new booking

Example:
"2024-08-13T10:00:00Z"

​
field name :rescheduledBy
field type :string
Email of the person who is rescheduling the booking - only needed when rescheduling a booking that requires a confirmation.
If event type owner email is provided then rescheduled booking will be automatically confirmed. If attendee email or no email is passed then the event type
owner will have to confirm the rescheduled booking.

​
field name : reschedulingReason
field type :string
Reason for rescheduling the booking

Example:
"User requested reschedule"

​
field name :emailVerificationCode
field type :string
Email verification code required when event type has email verification enabled.

Example:
"123456"


respond: 


{
  "status": "success",
  "data": {
    "id": 123,
    "uid": "booking_uid_123",
    "title": "Consultation",
    "description": "Learn how to integrate scheduling into marketplace.",
    "hosts": [
      {
        "id": 1,
        "name": "Jane Doe",
        "email": "jane100@example.com",
        "username": "jane100",
        "timeZone": "America/Los_Angeles"
      }
    ],
    "status": "accepted",
    "start": "2024-08-13T15:30:00Z",
    "end": "2024-08-13T16:30:00Z",
    "duration": 60,
    "eventTypeId": 50,
    "eventType": {
      "id": 1,
      "slug": "some-event"
    },
    "location": "https://example.com/meeting",
    "absentHost": true,
    "createdAt": "2024-08-13T15:30:00Z",
    "updatedAt": "2024-08-13T15:30:00Z",
    "attendees": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "timeZone": "America/New_York",
        "absent": false,
        "language": "en",
        "phoneNumber": "+1234567890"
      }
    ],
    "bookingFieldsResponses": {
      "customField": "customValue"
    },
    "cancellationReason": "User requested cancellation",
    "cancelledByEmail": "canceller@example.com",
    "reschedulingReason": "User rescheduled the event",
    "rescheduledByEmail": "rescheduler@example.com",
    "rescheduledFromUid": "previous_uid_123",
    "rescheduledToUid": "new_uid_456",
    "meetingUrl": "https://example.com/recurring-meeting",
    "metadata": {
      "key": "value"
    },
    "rating": 4,
    "icsUid": "ics_uid_123",
    "guests": [
      "guest1@example.com",
      "guest2@example.com"
    ]
  }
}





/////////////////////////////////



4- cancel a booking 


curl --request POST \
  --url /api/v1/bookings/{bookingUid}/cancel \
  --header 'Content-Type: application/json' \
  --header 'cal-api-version: 2024-08-13' \
  --data '
{
  "cancellationReason": "User requested cancellation",
  "cancelSubsequentBookings": true
}
'


Headers
​

​
Authorization
string
value must be Bearer <token> where <token> is api key prefixed with cal_ or managed user access token


Path Parameters
​
bookingUid
stringrequired


response : {
  "status": "success",
  "data": {
    "id": 123,
    "uid": "booking_uid_123",
    "title": "Consultation",
    "description": "Learn how to integrate scheduling into marketplace.",
    "hosts": [
      {
        "id": 1,
        "name": "Jane Doe",
        "email": "jane100@example.com",
        "username": "jane100",
        "timeZone": "America/Los_Angeles"
      }
    ],
    "status": "accepted",
    "start": "2024-08-13T15:30:00Z",
    "end": "2024-08-13T16:30:00Z",
    "duration": 60,
    "eventTypeId": 50,
    "eventType": {
      "id": 1,
      "slug": "some-event"
    },
    "location": "https://example.com/meeting",
    "absentHost": true,
    "createdAt": "2024-08-13T15:30:00Z",
    "updatedAt": "2024-08-13T15:30:00Z",
    "attendees": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "timeZone": "America/New_York",
        "absent": false,
        "language": "en",
        "phoneNumber": "+1234567890"
      }
    ],
    "bookingFieldsResponses": {
      "customField": "customValue"
    },
    "cancellationReason": "User requested cancellation",
    "cancelledByEmail": "canceller@example.com",
    "reschedulingReason": "User rescheduled the event",
    "rescheduledByEmail": "rescheduler@example.com",
    "rescheduledFromUid": "previous_uid_123",
    "rescheduledToUid": "new_uid_456",
    "meetingUrl": "https://example.com/recurring-meeting",
    "metadata": {
      "key": "value"
    },
    "rating": 4,
    "icsUid": "ics_uid_123",
    "guests": [
      "guest1@example.com",
      "guest2@example.com"
    ]
  }
}



//////////////////////////////////


5 Get available time slots for an event type



curl --request GET \
  --url /api/v1/slots \
  --header 'Authorization: Bearer <token>' \
  --header 'cal-api-version: 2024-09-04'




There are 4 ways to get available slots for event type of an individual user:

By event type id. Event type id can be of user and team event types. Example ‘/v2/slots?eventTypeId=10&start=2050-09-05&end=2050-09-06&timeZone=Europe/Rome’

By event type slug + username. Example ‘/v2/slots?eventTypeSlug=intro&username=bob&start=2050-09-05&end=2050-09-06’

By event type slug + username + organization slug when searching within an organization. Example ‘/v2/slots?organizationSlug=org-slug&eventTypeSlug=intro&username=bob&start=2050-09-05&end=2050-09-06’

By usernames only (used for dynamic event type - there is no specific event but you want to know when 2 or more people are available). Example ‘/v2/slots?usernames=alice,bob&username=bob&organizationSlug=org-slug&start=2050-09-05&end=2050-09-06’. As you see you also need to provide the slug of the organization to which each user in the ‘usernames’ array belongs.

All of them require “start” and “end” query parameters which define the time range for which available slots should be checked. Optional parameters are:

timeZone: Time zone in which the available slots should be returned. Defaults to UTC.
duration: Only use for event types that allow multiple durations or for dynamic event types. If not passed for multiple duration event types defaults to default duration. For dynamic event types defaults to 30 aka each returned slot is 30 minutes long. So duration=60 means that returned slots will be each 60 minutes long.
format: Format of the slots. By default return is an object where each key is date and value is array of slots as string. If you want to get start and end of each slot use “range” as value.
bookingUidToReschedule: When rescheduling an existing booking, provide the booking’s unique identifier to exclude its time slot from busy time calculations. This ensures the original booking time appears as available for rescheduling.




Authorizations
​
Authorization
stringheaderrequired
Bearer authentication header of the form Bearer <token>, where <token> is your auth token.


  responds: 
  {
  "status": "success",
  "data": {
    "2050-09-05": [
      {
        "start": "2050-09-05T09:00:00.000+02:00"
      },
      {
        "start": "2050-09-05T10:00:00.000+02:00"
      }
    ],
    "2050-09-06": [
      {
        "start": "2050-09-06T09:00:00.000+02:00"
      },
      {
        "start": "2050-09-06T10:00:00.000+02:00"
      }
    ]
  }
}