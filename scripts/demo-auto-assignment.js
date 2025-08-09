#!/usr/bin/env node

/**
 * Demo script for automatic client assignment
 * This simulates clients signing up and being automatically assigned to workers
 */

const API_BASE_URL = 'http://localhost:3001';

// Sample client signups
const sampleClients = [
    {
        name: "David Wilson",
        email: "david.wilson@email.com",
        phone: "+1 (555) 111-2222",
        linkedinUrl: "https://linkedin.com/in/davidwilson"
    },
    {
        name: "Maria Garcia",
        email: "maria.garcia@email.com",
        phone: "+1 (555) 222-3333",
        linkedinUrl: "https://linkedin.com/in/mariagarcia"
    },
    {
        name: "James Brown",
        email: "james.brown@email.com",
        phone: "+1 (555) 333-4444",
        linkedinUrl: "https://linkedin.com/in/jamesbrown"
    }
];

async function autoAssignClient(clientData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/clients/auto-assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clientData),
        });

        const result = await response.json();

        if (result.success) {
            console.log(`✅ ${clientData.name} automatically assigned to worker ${result.data.workerId}`);
            console.log(`   - Client ID: ${result.data.id}`);
            console.log(`   - Status: ${result.data.status}`);
            console.log(`   - New Badge: ${result.data.isNew ? 'YES' : 'NO'}`);
            console.log(`   - Assigned At: ${new Date(result.data.assignedAt).toLocaleString()}`);
            console.log('');
        } else {
            console.log(`❌ Failed to assign ${clientData.name}: ${result.error}`);
        }
    } catch (error) {
        console.log(`❌ Error assigning ${clientData.name}: ${error.message}`);
    }
}

async function checkNewClients() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/clients?status=new`);
        const result = await response.json();

        if (result.success) {
            console.log(`📊 Found ${result.data.length} new clients (assigned within 72 hours):`);
            result.data.forEach(client => {
                const assignedTime = new Date(client.assignedAt);
                const hoursAgo = Math.round((Date.now() - assignedTime.getTime()) / (1000 * 60 * 60));
                console.log(`   - ${client.name} (assigned ${hoursAgo} hours ago)`);
            });
        }
    } catch (error) {
        console.log(`❌ Error checking new clients: ${error.message}`);
    }
}

async function main() {
    console.log('🚀 Demo: Automatic Client Assignment System\n');

    console.log('📝 Simulating client signups...\n');

    // Auto-assign clients
    for (const client of sampleClients) {
        await autoAssignClient(client);
        // Small delay between assignments
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('🔍 Checking new clients...\n');
    await checkNewClients();

    console.log('✨ Demo completed!');
    console.log('💡 Check the dashboard to see the new clients with "NEW" badges');
    console.log('💡 Use the "New (72h)" filter to see only recently assigned clients');
}

// Run the demo
main().catch(console.error); 