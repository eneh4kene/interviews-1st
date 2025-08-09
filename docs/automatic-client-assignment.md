# Automatic Client Assignment System

## Overview

The platform now supports automatic client assignment when new clients sign up, eliminating the need for manual assignment in most cases. This system includes a "NEW" badge that appears for 72 hours after assignment to help workers identify recently assigned clients.

## Features

### 🆕 Automatic Assignment
- **Endpoint**: `POST /api/clients/auto-assign`
- **Purpose**: Automatically assign new clients to workers when they sign up
- **Load Balancing**: Currently assigns to `worker1`, but can be extended to implement round-robin, least busy, or skill-based assignment

### 🏷️ NEW Badge System
- **Duration**: 72 hours from assignment time
- **Visual Indicator**: Orange "🆕 NEW" badge on client cards
- **Automatic Expiry**: Badge disappears after 72 hours
- **Filter Support**: "New (72h)" filter option in dashboard

### 📊 Enhanced Dashboard
- **New Clients Stats Card**: Shows count of clients assigned in last 72 hours
- **Filter Options**: "New (72h)" filter to view only recently assigned clients
- **Visual Indicators**: NEW badges on client cards for easy identification

## API Endpoints

### Auto-Assign Client
```http
POST /api/clients/auto-assign
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@email.com",
  "phone": "+1 (555) 123-4567",
  "linkedinUrl": "https://linkedin.com/in/johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "client_1234567890",
    "workerId": "worker1",
    "name": "John Doe",
    "email": "john.doe@email.com",
    "phone": "+1 (555) 123-4567",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "status": "active",
    "paymentStatus": "pending",
    "totalInterviews": 0,
    "totalPaid": 0,
    "isNew": true,
    "assignedAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Client John Doe automatically assigned to worker worker1"
}
```

### Filter New Clients
```http
GET /api/clients?status=new
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "client_1234567890",
      "workerId": "worker1",
      "name": "John Doe",
      "isNew": true,
      "assignedAt": "2024-01-15T10:30:00.000Z",
      // ... other fields
    }
  ],
  "message": "Found 1 clients"
}
```

## Data Model Changes

### Client Interface
```typescript
export interface Client {
  id: string;
  workerId: string;
  name: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  profilePicture?: string;
  status: 'active' | 'inactive' | 'placed';
  paymentStatus: 'pending' | 'paid' | 'overdue';
  totalInterviews: number;
  totalPaid: number;
  isNew: boolean; // NEW: Indicates if client is newly assigned (within 72 hours)
  assignedAt: Date; // NEW: When the client was assigned to the worker
  createdAt: Date;
  updatedAt: Date;
}
```

### Dashboard Stats Interface
```typescript
export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  newClients: number; // NEW: Number of clients assigned in the last 72 hours
  interviewsThisMonth: number;
  placementsThisMonth: number;
  successRate: number;
  pendingPayments: number;
  totalRevenue: number;
  interviewsScheduled: number;
  interviewsAccepted: number;
  interviewsDeclined: number;
}
```

## Implementation Details

### 72-Hour Logic
The system calculates the 72-hour window using:
```javascript
const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
const isNew = client.assignedAt > seventyTwoHoursAgo;
```

### Filter Implementation
```javascript
if (statusFilter === "new") {
  // Filter for clients assigned within the last 72 hours
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  filteredClients = filteredClients.filter(client => 
    client.assignedAt > seventyTwoHoursAgo
  );
}
```

### Badge Display
```jsx
{client.isNew && (
  <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
    🆕 NEW
  </span>
)}
```

## Usage Examples

### 1. Client Signup Flow
```javascript
// When a client signs up on your website
const response = await fetch('/api/clients/auto-assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Jane Smith',
    email: 'jane.smith@email.com',
    phone: '+1 (555) 987-6543',
    linkedinUrl: 'https://linkedin.com/in/janesmith'
  })
});

const result = await response.json();
console.log(`Client assigned to worker: ${result.data.workerId}`);
```

### 2. Dashboard Filtering
```javascript
// Filter to show only new clients
const newClients = await fetch('/api/clients?status=new');
const result = await newClients.json();
console.log(`Found ${result.data.length} new clients`);
```

### 3. Demo Script
Run the demo script to see the system in action:
```bash
node scripts/demo-auto-assignment.js
```

## Future Enhancements

### Load Balancing Strategies
1. **Round-Robin**: Assign clients in rotation
2. **Least Busy**: Assign to worker with fewest active clients
3. **Skill-Based**: Assign based on worker expertise
4. **Geographic**: Assign based on location/timezone

### Advanced Features
1. **Priority Queue**: Handle high-priority clients first
2. **Auto-Reassignment**: Move clients if workers are overloaded
3. **Notification System**: Alert workers of new assignments
4. **Analytics**: Track assignment patterns and success rates

## Benefits

### For Workers
- **Immediate Visibility**: NEW badges highlight recent assignments
- **Better Organization**: Filter to focus on new clients
- **Reduced Manual Work**: No need to manually assign clients

### For Platform
- **Scalability**: Handle high volume of signups automatically
- **Consistency**: Standardized assignment process
- **Analytics**: Track assignment patterns and worker load

### For Clients
- **Faster Response**: Immediate assignment to available workers
- **Better Experience**: No waiting for manual assignment
- **Consistent Service**: Standardized onboarding process

## Configuration

### Environment Variables
```env
# Worker assignment strategy (future enhancement)
ASSIGNMENT_STRATEGY=round_robin|least_busy|skill_based

# NEW badge duration (in hours)
NEW_CLIENT_DURATION=72

# Maximum clients per worker
MAX_CLIENTS_PER_WORKER=50
```

### Database Schema (Future)
```sql
-- Workers table
CREATE TABLE workers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  max_clients INTEGER DEFAULT 50,
  current_clients INTEGER DEFAULT 0,
  skills TEXT[], -- Array of skills
  timezone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Client assignments table
CREATE TABLE client_assignments (
  id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) REFERENCES clients(id),
  worker_id VARCHAR(255) REFERENCES workers(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assignment_reason VARCHAR(255), -- 'auto', 'manual', 'reassignment'
  created_at TIMESTAMP DEFAULT NOW()
);
```

This system provides a robust foundation for automatic client assignment while maintaining flexibility for future enhancements and different assignment strategies. 