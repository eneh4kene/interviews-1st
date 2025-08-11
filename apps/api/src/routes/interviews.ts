import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import { authenticate, authorize } from '../middleware/auth';
import { interviewSchedulingService } from '../services/interviewScheduling';
import { ApiResponse, Interview, Payment, ClientNotification } from '@interview-me/types';

const router = express.Router();

// Mock data - in real app, this would come from database
const mockInterviews: Interview[] = [
    {
        id: "1",
        applicationId: "1",
        clientId: "1",
        companyName: "TechCorp Inc.",
        jobTitle: "Senior Software Engineer",
        scheduledDate: new Date("2024-02-01T14:00:00Z"),
        interviewType: "video",
        status: "scheduled",
        paymentStatus: "pending",
        paymentAmount: 10,
        paymentCurrency: "GBP",
        createdAt: new Date("2024-01-25"),
        updatedAt: new Date("2024-01-25"),
    },
    {
        id: "2",
        applicationId: "2",
        clientId: "2",
        companyName: "StartupXYZ",
        jobTitle: "Full Stack Developer",
        scheduledDate: new Date("2024-02-05T10:00:00Z"),
        interviewType: "phone",
        status: "client_accepted",
        paymentStatus: "paid",
        paymentAmount: 10,
        paymentCurrency: "GBP",
        clientResponseDate: new Date("2024-01-26"),
        clientResponseNotes: "Excited about this opportunity!",
        paidAt: new Date("2024-01-26"),
        createdAt: new Date("2024-01-26"),
        updatedAt: new Date("2024-01-26"),
    },
];

const mockPayments: Payment[] = [
    {
        id: "1",
        interviewId: "2",
        clientId: "2",
        amount: 10,
        currency: "GBP",
        status: "completed",
        stripePaymentIntentId: "pi_1234567890",
        stripeCustomerId: "cus_1234567890",
        paymentMethod: "card",
        paidAt: new Date("2024-01-26"),
        createdAt: new Date("2024-01-26"),
        updatedAt: new Date("2024-01-26"),
    },
];

const mockNotifications: ClientNotification[] = [
    {
        id: "1",
        clientId: "1",
        type: "interview_scheduled",
        title: "Interview Scheduled - TechCorp Inc.",
        message: "Great news! We've scheduled an interview for you with TechCorp Inc. Please review and accept to proceed.",
        isRead: false,
        actionRequired: true,
        actionUrl: "/interviews/1/respond",
        createdAt: new Date("2024-01-25"),
        updatedAt: new Date("2024-01-25"),
    },
    {
        id: "2",
        clientId: "2",
        type: "payment_successful",
        title: "Payment Successful - StartupXYZ Interview",
        message: "Your payment of £10 has been processed successfully. Your interview is confirmed!",
        isRead: true,
        actionRequired: false,
        createdAt: new Date("2024-01-26"),
        updatedAt: new Date("2024-01-26"),
    },
];

// Get all interviews for a worker
router.get('/', (req, res) => {
    const workerId = req.query.workerId as string;
    const status = req.query.status as string;

    let filteredInterviews = mockInterviews;

    if (status && status !== 'all') {
        filteredInterviews = filteredInterviews.filter(interview => interview.status === status);
    }

    const response: ApiResponse<Interview[]> = {
        success: true,
        data: filteredInterviews,
        message: `Found ${filteredInterviews.length} interviews`,
    };

    res.json(response);
});

// Get interviews for a specific client
router.get('/client/:clientId', (req, res) => {
    const clientId = req.params.clientId;
    const interviews = mockInterviews.filter(i => i.clientId === clientId);

    const response: ApiResponse<Interview[]> = {
        success: true,
        data: interviews,
        message: `Found ${interviews.length} interviews for client`,
    };

    res.json(response);
});

// Get interview by ID
router.get('/:id', (req, res) => {
    const interviewId = req.params.id;
    const interview = mockInterviews.find(i => i.id === interviewId);

    if (!interview) {
        const response: ApiResponse = {
            success: false,
            error: 'Interview not found',
        };
        return res.status(404).json(response);
    }

    const response: ApiResponse<Interview> = {
        success: true,
        data: interview,
    };

    res.json(response);
});

// Schedule a new interview
const scheduleInterviewSchema = z.object({
    body: z.object({
        applicationId: z.string().min(1, 'Application ID is required'),
        clientId: z.string().min(1, 'Client ID is required'),
        companyName: z.string().min(1, 'Company name is required'),
        jobTitle: z.string().min(1, 'Job title is required'),
        scheduledDate: z.string().datetime('Invalid date format'),
        interviewType: z.enum(['phone', 'video', 'onsite', 'technical', 'behavioral']),
        workerNotes: z.string().optional(),
    }),
});

router.post('/', validateRequest(scheduleInterviewSchema), (req, res) => {
    const { applicationId, clientId, companyName, jobTitle, scheduledDate, interviewType, workerNotes } = req.body;

    const newInterview: Interview = {
        id: `interview_${Date.now()}`,
        applicationId,
        clientId,
        companyName,
        jobTitle,
        scheduledDate: new Date(scheduledDate),
        interviewType,
        status: 'scheduled',
        paymentStatus: 'pending',
        paymentAmount: 10,
        paymentCurrency: 'GBP',
        workerNotes,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    // Create notification for client
    const notification: ClientNotification = {
        id: `notification_${Date.now()}`,
        clientId,
        type: 'interview_scheduled',
        title: `Interview Scheduled - ${companyName}`,
        message: `Great news! We've scheduled an interview for you with ${companyName}. Please review and accept to proceed.`,
        isRead: false,
        actionRequired: true,
        actionUrl: `/interviews/${newInterview.id}/respond`,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    mockInterviews.push(newInterview);
    mockNotifications.push(notification);

    const response: ApiResponse<Interview> = {
        success: true,
        data: newInterview,
        message: 'Interview scheduled successfully. Client has been notified.',
    };

    res.status(201).json(response);
});

// Client responds to interview (accept/decline)
const respondToInterviewSchema = z.object({
    body: z.object({
        response: z.enum(['accept', 'decline']),
        notes: z.string().optional(),
    }),
});

router.post('/:id/respond', validateRequest(respondToInterviewSchema), (req, res) => {
    const interviewId = req.params.id;
    const { response, notes } = req.body;

    const interviewIndex = mockInterviews.findIndex(i => i.id === interviewId);

    if (interviewIndex === -1) {
        const response: ApiResponse = {
            success: false,
            error: 'Interview not found',
        };
        return res.status(404).json(response);
    }

    const interview = mockInterviews[interviewIndex];

    // Update interview status
    interview.status = response === 'accept' ? 'client_accepted' : 'client_declined';
    interview.clientResponseDate = new Date();
    interview.clientResponseNotes = notes;
    interview.updatedAt = new Date();

    // Create payment record if accepted
    if (response === 'accept') {
        const payment: Payment = {
            id: `payment_${Date.now()}`,
            interviewId,
            clientId: interview.clientId,
            amount: interview.paymentAmount,
            currency: interview.paymentCurrency,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        mockPayments.push(payment);

        // Create payment notification
        const paymentNotification: ClientNotification = {
            id: `notification_${Date.now()}`,
            clientId: interview.clientId,
            type: 'payment_required',
            title: 'Payment Required - Interview Confirmation',
            message: `Please complete your payment of £${interview.paymentAmount} to confirm your interview with ${interview.companyName}.`,
            isRead: false,
            actionRequired: true,
            actionUrl: `/payments/${payment.id}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        mockNotifications.push(paymentNotification);
    }

    const apiResponse: ApiResponse<Interview> = {
        success: true,
        data: interview,
        message: `Interview ${response === 'accept' ? 'accepted' : 'declined'} successfully`,
    };

    res.json(apiResponse);
});

// Process payment
const processPaymentSchema = z.object({
    body: z.object({
        paymentMethod: z.string().min(1, 'Payment method is required'),
        stripePaymentIntentId: z.string().optional(),
    }),
});

router.post('/:id/pay', validateRequest(processPaymentSchema), (req, res) => {
    const interviewId = req.params.id;
    const { paymentMethod, stripePaymentIntentId } = req.body;

    const interview = mockInterviews.find(i => i.id === interviewId);

    if (!interview) {
        const response: ApiResponse = {
            success: false,
            error: 'Interview not found',
        };
        return res.status(404).json(response);
    }

    if (interview.status !== 'client_accepted') {
        const response: ApiResponse = {
            success: false,
            error: 'Interview must be accepted by client before payment',
        };
        return res.status(400).json(response);
    }

    // Find and update payment
    const paymentIndex = mockPayments.findIndex(p => p.interviewId === interviewId);

    if (paymentIndex === -1) {
        const response: ApiResponse = {
            success: false,
            error: 'Payment record not found',
        };
        return res.status(404).json(response);
    }

    const payment = mockPayments[paymentIndex];
    payment.status = 'completed';
    payment.paymentMethod = paymentMethod;
    payment.stripePaymentIntentId = stripePaymentIntentId;
    payment.paidAt = new Date();
    payment.updatedAt = new Date();

    // Update interview payment status
    interview.paymentStatus = 'paid';
    interview.updatedAt = new Date();

    // Create success notification
    const successNotification: ClientNotification = {
        id: `notification_${Date.now()}`,
        clientId: interview.clientId,
        type: 'payment_successful',
        title: 'Payment Successful - Interview Confirmed',
        message: `Your payment of £${interview.paymentAmount} has been processed successfully. Your interview with ${interview.companyName} is confirmed!`,
        isRead: false,
        actionRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    mockNotifications.push(successNotification);

    const response: ApiResponse<Payment> = {
        success: true,
        data: payment,
        message: 'Payment processed successfully',
    };

    res.json(response);
});

// Get client notifications
router.get('/client/:clientId/notifications', (req, res) => {
    const clientId = req.params.clientId;
    const notifications = mockNotifications.filter(n => n.clientId === clientId);

    const response: ApiResponse<ClientNotification[]> = {
        success: true,
        data: notifications,
        message: `Found ${notifications.length} notifications`,
    };

    res.json(response);
});

// Mark notification as read
router.put('/notifications/:id/read', (req, res) => {
    const notificationId = req.params.id;
    const notificationIndex = mockNotifications.findIndex(n => n.id === notificationId);

    if (notificationIndex === -1) {
        const response: ApiResponse = {
            success: false,
            error: 'Notification not found',
        };
        return res.status(404).json(response);
    }

    mockNotifications[notificationIndex].isRead = true;
    mockNotifications[notificationIndex].updatedAt = new Date();

    const response: ApiResponse = {
        success: true,
        message: 'Notification marked as read',
    };

    res.json(response);
});

export default router; 