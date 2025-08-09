import express from 'express';
import { z } from 'zod';
import { validateRequest } from 'zod-express-middleware';
import { ApiResponse, Client } from '@interview-me/types';

const router = express.Router();

// Mock data - in real app, this would come from database
const mockClients: Client[] = [
    {
        id: "1",
        workerId: "worker1",
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1 (555) 123-4567",
        linkedinUrl: "https://linkedin.com/in/sarahjohnson",
        status: "active",
        paymentStatus: "pending",
        totalInterviews: 2,
        totalPaid: 20,
        isNew: false,
        assignedAt: new Date("2024-01-15"),
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
    },
    {
        id: "2",
        workerId: "worker1",
        name: "Michael Chen",
        email: "michael.chen@email.com",
        phone: "+1 (555) 234-5678",
        linkedinUrl: "https://linkedin.com/in/michaelchen",
        status: "active",
        paymentStatus: "paid",
        totalInterviews: 1,
        totalPaid: 10,
        isNew: false,
        assignedAt: new Date("2024-01-10"),
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
    },
    {
        id: "3",
        workerId: "worker1",
        name: "Emily Rodriguez",
        email: "emily.rodriguez@email.com",
        phone: "+1 (555) 345-6789",
        linkedinUrl: "https://linkedin.com/in/emilyrodriguez",
        status: "placed",
        paymentStatus: "paid",
        totalInterviews: 3,
        totalPaid: 30,
        isNew: false,
        assignedAt: new Date("2023-12-20"),
        createdAt: new Date("2023-12-20"),
        updatedAt: new Date("2024-01-05"),
    },
    // NEW: Recently assigned clients (within 72 hours)
    {
        id: "4",
        workerId: "worker1",
        name: "Alex Thompson",
        email: "alex.thompson@email.com",
        phone: "+1 (555) 456-7890",
        linkedinUrl: "https://linkedin.com/in/alexthompson",
        status: "active",
        paymentStatus: "pending",
        totalInterviews: 0,
        totalPaid: 0,
        isNew: true,
        assignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
        id: "5",
        workerId: "worker1",
        name: "Jessica Kim",
        email: "jessica.kim@email.com",
        phone: "+1 (555) 567-8901",
        linkedinUrl: "https://linkedin.com/in/jessicakim",
        status: "active",
        paymentStatus: "pending",
        totalInterviews: 0,
        totalPaid: 0,
        isNew: true,
        assignedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
];

// Get all clients for a worker
router.get('/', (req, res) => {
    const workerId = req.query.workerId as string;
    const status = req.query.status as string;

    let filteredClients = mockClients;

    if (workerId) {
        filteredClients = filteredClients.filter(client => client.workerId === workerId);
    }

    if (status && status !== 'all') {
        if (status === 'new') {
            // Filter for clients assigned within the last 72 hours
            const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
            filteredClients = filteredClients.filter(client =>
                client.assignedAt > seventyTwoHoursAgo
            );
        } else {
            filteredClients = filteredClients.filter(client => client.status === status);
        }
    }

    const response: ApiResponse<Client[]> = {
        success: true,
        data: filteredClients,
        message: `Found ${filteredClients.length} clients`,
    };

    res.json(response);
});

// Get client by ID
router.get('/:id', (req, res) => {
    const clientId = req.params.id;
    const client = mockClients.find(c => c.id === clientId);

    if (!client) {
        const response: ApiResponse = {
            success: false,
            error: 'Client not found',
        };
        return res.status(404).json(response);
    }

    const response: ApiResponse<Client> = {
        success: true,
        data: client,
    };

    res.json(response);
});

// Create new client
const createClientSchema = z.object({
    body: z.object({
        workerId: z.string().min(1, 'Worker ID is required'),
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
        phone: z.string().optional(),
        linkedinUrl: z.string().url().optional().or(z.literal('')),
        status: z.enum(['active', 'inactive', 'placed']).default('active'),
    }),
});

router.post('/', validateRequest(createClientSchema), (req, res) => {
    const { workerId, name, email, phone, linkedinUrl, status } = req.body;

    const newClient: Client = {
        id: `client_${Date.now()}`,
        workerId,
        name,
        email,
        phone,
        linkedinUrl,
        status,
        paymentStatus: "pending",
        totalInterviews: 0,
        totalPaid: 0,
        isNew: true,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    // In real app, save to database
    mockClients.push(newClient);

    const response: ApiResponse<Client> = {
        success: true,
        data: newClient,
        message: 'Client created successfully',
    };

    res.status(201).json(response);
});

// NEW: Automatic client assignment endpoint (for when clients sign up)
const autoAssignClientSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
        phone: z.string().optional(),
        linkedinUrl: z.string().url().optional().or(z.literal('')),
    }),
});

router.post('/auto-assign', validateRequest(autoAssignClientSchema), (req, res) => {
    const { name, email, phone, linkedinUrl } = req.body;

    // In real app, this would implement load balancing logic
    // For now, assign to worker1 (could be round-robin, least busy, etc.)
    const assignedWorkerId = "worker1";

    const newClient: Client = {
        id: `client_${Date.now()}`,
        workerId: assignedWorkerId,
        name,
        email,
        phone,
        linkedinUrl,
        status: "active",
        paymentStatus: "pending",
        totalInterviews: 0,
        totalPaid: 0,
        isNew: true,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    // In real app, save to database
    mockClients.push(newClient);

    const response: ApiResponse<Client> = {
        success: true,
        data: newClient,
        message: `Client ${name} automatically assigned to worker ${assignedWorkerId}`,
    };

    res.status(201).json(response);
});

// Update client
const updateClientSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').optional(),
        email: z.string().email('Invalid email format').optional(),
        phone: z.string().optional(),
        linkedinUrl: z.string().url().optional().or(z.literal('')),
        status: z.enum(['active', 'inactive', 'placed']).optional(),
    }),
});

router.put('/:id', validateRequest(updateClientSchema), (req, res) => {
    const clientId = req.params.id;
    const clientIndex = mockClients.findIndex(c => c.id === clientId);

    if (clientIndex === -1) {
        const response: ApiResponse = {
            success: false,
            error: 'Client not found',
        };
        return res.status(404).json(response);
    }

    const updatedClient = {
        ...mockClients[clientIndex],
        ...req.body,
        updatedAt: new Date(),
    };

    mockClients[clientIndex] = updatedClient;

    const response: ApiResponse<Client> = {
        success: true,
        data: updatedClient,
        message: 'Client updated successfully',
    };

    res.json(response);
});

// Delete client
router.delete('/:id', (req, res) => {
    const clientId = req.params.id;
    const clientIndex = mockClients.findIndex(c => c.id === clientId);

    if (clientIndex === -1) {
        const response: ApiResponse = {
            success: false,
            error: 'Client not found',
        };
        return res.status(404).json(response);
    }

    mockClients.splice(clientIndex, 1);

    const response: ApiResponse = {
        success: true,
        message: 'Client deleted successfully',
    };

    res.json(response);
});

export default router; 