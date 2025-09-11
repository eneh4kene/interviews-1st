#i tried on one of th Email Template Usage Guide

## 🎯 **How to Use Templates to Send Emails**

### **1. Template-Based Email Sending**

Templates are used to send emails with dynamic content. Here's how the system works:

#### **A. Automatic Email Sending**
- **Client Registration**: When a client registers, a welcome email is automatically sent using the `client_welcome` template
- **Interview Scheduling**: When an interview is scheduled, the `interview_scheduled` template is used
- **Job Responses**: When companies respond to applications, the `job_response` template is used

#### **B. Manual Email Sending**
- **Test Emails**: Use the "Send Test" button on any template to send a test email
- **Bulk Emails**: Send emails to multiple clients using specific templates
- **Custom Emails**: Create and send custom emails using any template

### **2. Template Variables System**

Templates use variables that get replaced with actual data:

#### **Example Template:**
```html
<h1>Welcome {{client_name}}!</h1>
<p>Thank you for joining {{company_name}}.</p>
<p>Your assigned worker is {{worker_name}}.</p>
<p>Contact them at {{worker_phone}}.</p>
```

#### **When Sent, Variables Are Replaced:**
```html
<h1>Welcome John Doe!</h1>
<p>Thank you for joining InterviewsFirst.</p>
<p>Your assigned worker is Sarah Johnson.</p>
<p>Contact them at +1-555-0123.</p>
```

### **3. How to Send Emails Using Templates**

#### **Method 1: Through the Admin Dashboard**
1. Go to **Email Management** → **Templates**
2. Click **"Send Test"** on any template
3. Enter recipient email address
4. Email is sent with sample data

#### **Method 2: Programmatically (API)**
```javascript
// Send welcome email to a client
await apiService.sendWelcomeEmail(clientId);

// Send interview scheduled email
await apiService.sendInterviewScheduledEmail(clientId, interviewData);

// Send custom email using template
await apiService.sendTemplateEmail({
  templateName: 'client_welcome',
  toEmail: 'client@example.com',
  toName: 'John Doe',
  variables: {
    client_name: 'John Doe',
    company_name: 'InterviewsFirst',
    worker_name: 'Sarah Johnson',
    worker_phone: '+1-555-0123'
  }
});
```

#### **Method 3: Through Email Queue**
1. Templates are automatically queued when events occur
2. Go to **Email Management** → **Queue**
3. Click **"Process Queue"** to send all pending emails

### **4. Template Categories and Usage**

#### **Welcome Templates**
- **Purpose**: Client onboarding
- **Trigger**: Client registration
- **Variables**: `{{client_name}}`, `{{worker_name}}`, `{{company_name}}`

#### **Interview Templates**
- **Purpose**: Interview scheduling and updates
- **Trigger**: Interview creation/update
- **Variables**: `{{interview_date}}`, `{{interview_time}}`, `{{interview_type}}`

#### **Notification Templates**
- **Purpose**: System notifications
- **Trigger**: Important events
- **Variables**: `{{notification_type}}`, `{{message}}`, `{{action_url}}`

#### **Marketing Templates**
- **Purpose**: Promotional emails
- **Trigger**: Manual or scheduled
- **Variables**: `{{offer_title}}`, `{{offer_description}}`, `{{cta_url}}`

### **5. Creating Custom Email Sending**

#### **Step 1: Create a Template**
1. Go to **Email Management** → **Templates**
2. Click **"New Template"**
3. Fill in template details and content
4. Save the template

#### **Step 2: Send Using the Template**
1. Use the **"Send Test"** button for immediate testing
2. Or integrate with your application code using the API

### **6. Email Queue Management**

#### **Viewing the Queue**
- Go to **Email Management** → **Queue**
- See all pending, sent, and failed emails
- Filter by status (pending, sent, failed, etc.)

#### **Processing the Queue**
- Click **"Process Queue"** to send all pending emails
- Failed emails are automatically retried
- Check the queue regularly for any issues

### **7. Best Practices**

#### **Template Design**
- Use clear, professional language
- Include all necessary variables
- Test templates before using in production
- Keep templates mobile-friendly

#### **Variable Usage**
- Always provide fallback values for variables
- Use descriptive variable names
- Test with different data sets

#### **Email Sending**
- Monitor the email queue regularly
- Check for failed emails and retry if needed
- Use appropriate email categories
- Respect email frequency limits

### **8. Troubleshooting**

#### **Templates Not Saving**
- Check if all required fields are filled
- Ensure proper authentication
- Check browser console for errors

#### **Emails Not Sending**
- Check the email queue for errors
- Verify SendGrid configuration
- Check email deliverability settings

#### **Variables Not Replacing**
- Ensure variable names match exactly
- Check template syntax: `{{variable_name}}`
- Verify data is provided for all variables
