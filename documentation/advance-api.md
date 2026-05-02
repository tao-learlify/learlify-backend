# AptisGo Advance API Service

## This documentation covers the Advance API for tracking user progress in courses.

The Advance API allows users to create, retrieve, and update their progress through course units. It tracks which units have been completed and which is the current active unit.

---

## Advance Interface

``
  Advance Model
    properties {
      id: number
      userId: number
      courseId: number
      content: Record<string, unknown>
    }
``

``
  Content Structure (dynamic)
    content: {
      [unitId: string]: {
        completed: boolean
        general: number
        last: boolean
      }
    }
``

---

## GET All / Get User Progress

Retrieves the user's progress for a specific course. Requires an active subscription with COURSES feature.

``
  endpoint: '/api/v1/advance'
``

``
  Headers {
    Authorization: TRUE
  }
``

``
  Method = GET
``

``
  Query Parameters {
    courseId: number (required)
  }
``

#### Validation:

- ``courseId``: Must be a numeric value (required)

``
  interface as Response {
    statusCode: number
    message: string
    response: {
      id: number
      userId: number
      courseId: number
      content: Record<string, unknown>
    }
  }
``

#### Responses:

``statusCode (200)``: Success. Advance data retrieved successfully.

``statusCode (400)``: Bad Request. Validation error - courseId is missing or not numeric.

``statusCode (402)``: Payment Required. User doesn't have an active subscription with COURSES feature.

``statusCode (404)``: Not Found. Advance record not found for the user and course.

``statusCode (401)``: Unauthorized. Invalid or missing authentication token.

#### Example Response:

```json
{
  "message": "Advance obtained succesfully",
  "response": {
    "id": 1,
    "userId": 123,
    "courseId": 456,
    "content": {
      "1": {
        "completed": false,
        "general": 5,
        "last": true
      },
      "2": {
        "completed": true,
        "general": 10,
        "last": false
      }
    }
  },
  "statusCode": 200
}
```

---

## POST Create Advance

Creates a new advance record for tracking user progress in a course.

``
  endpoint: '/api/v1/advance'
``

``
  Headers {
    Authorization: TRUE
  }
``

``
  Method = POST
``

``
  Content-Type = application/json
``

``
  Request Body {
    courseId: number (required)
  }
``

``
  interface as Response {
    statusCode: number
    message: string
    response: {
      id: number
      userId: number
      courseId: number
      content: Record<string, unknown>
    }
  }
``

#### Validation:

- ``courseId``: Must be a numeric value (required)

#### Responses:

``statusCode (200)``: Success. Advance record created successfully.

``statusCode (400)``: Bad Request. Validation error - courseId must be numeric.

``statusCode (401)``: Unauthorized. Invalid or missing authentication token.

#### Example Request:

```json
{
  "courseId": 456
}
```

#### Example Response:

```json
{
  "message": "Advance has been created",
  "response": {
    "id": 1,
    "userId": 123,
    "courseId": 456,
    "content": {}
  },
  "statusCode": 200
}
```

---

## PUT Update Advance

Updates the user's progress in a course unit. Marks units as completed, sets the current active unit, and updates progress tracking.

``
  endpoint: '/api/v1/advance'
``

``
  Headers {
    Authorization: TRUE
  }
``

``
  Method = PUT
``

``
  Content-Type = application/json
``

``
  Request Body {
    courseId: number (required)
    unit: number (required)
    last: number (required)
    completed: boolean (optional)
  }
``

``
  interface as Response {
    statusCode: number
    response: {
      id: number
      userId: number
      courseId: number
      content: Record<string, unknown>
    }
  }
``

#### Validation:

- ``courseId``: Must be a numeric value (required)
- ``unit``: Must be a numeric value (required) - The unit ID being updated
- ``last``: Must be a numeric value (required) - The general progress marker
- ``completed``: Must be a boolean value (optional) - Whether the unit is completed

#### Responses:

``statusCode (201)``: Success. Advance record updated successfully.

``statusCode (400)``: Bad Request. Validation error in request body.

``statusCode (404)``: Not Found. Advance record not found for the user and course.

``statusCode (401)``: Unauthorized. Invalid or missing authentication token.

#### Behavior:

- When ``completed`` is true:
  - The unit is marked as completed (or keeps completion status if already completed)
  - The unit is set as the current/last active unit
  - All other units have their ``last`` flag set to false

- When ``completed`` is false or not provided:
  - The unit's completion status is preserved if it exists
  - The unit is set as the current/last active unit
  - All other units have their ``last`` flag set to false

#### Example Request (Mark unit as completed):

```json
{
  "courseId": 456,
  "unit": 3,
  "last": 15,
  "completed": true
}
```

#### Example Request (Update progress without completing):

```json
{
  "courseId": 456,
  "unit": 4,
  "last": 20
}
```

#### Example Response:

```json
{
  "response": {
    "id": 1,
    "userId": 123,
    "courseId": 456,
    "content": {
      "1": {
        "completed": true,
        "general": 5,
        "last": false
      },
      "2": {
        "completed": true,
        "general": 10,
        "last": false
      },
      "3": {
        "completed": true,
        "general": 15,
        "last": true
      }
    }
  },
  "statusCode": 201
}
```

---

## Database Schema

``
  Table: advance
    
  Columns:
    id: INTEGER (Primary Key)
    userId: INTEGER (Foreign Key -> users.id)
    courseId: INTEGER (Foreign Key -> courses.id)
    content: JSON
``

---

## Relations

- **BelongsToOne**: User (through userId)
- **HasMany**: Courses (through courseId)

---

## Business Rules

1. **Subscription Required**: To retrieve advance data (GET), the user must have an active subscription with the COURSES feature enabled.

2. **User Isolation**: Users can only access and modify their own advance records. The userId is automatically set from the authenticated user token.

3. **Content Management**: 
   - The content field is a dynamic JSON object where keys are unit IDs
   - Each unit tracks: completion status, general progress marker, and whether it's the current active unit
   - Only one unit can have ``last: true`` at any given time

4. **Progress Persistence**: 
   - Once a unit is marked as completed, it remains completed even if the user returns to it
   - The general progress marker can be updated without affecting completion status

---

## Error Messages

- ``"Advance Not Found"``: The requested advance record doesn't exist for the user and course combination
- ``"Requires Payment"``: User attempts to access advance data without an active COURSES subscription
- Validation errors are returned with descriptive messages when request data doesn't meet schema requirements
