const { Pool } = require('pg');
require('dotenv').config();

async function testTemplateSelection() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('🧪 Testing Template Selection System...\n');

        // Test 1: Check if is_default column exists
        console.log('1. Checking if is_default column exists...');
        const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'email_templates' AND column_name = 'is_default'
    `);

        if (columnCheck.rows.length > 0) {
            console.log('✅ is_default column exists:', columnCheck.rows[0]);
        } else {
            console.log('❌ is_default column not found');
            return;
        }

        // Test 2: Check existing templates and their default status
        console.log('\n2. Checking existing templates...');
        const templates = await pool.query(`
      SELECT name, category, is_active, is_default, created_at
      FROM email_templates 
      ORDER BY category, is_default DESC, created_at DESC
    `);

        console.log('📋 Current templates:');
        templates.rows.forEach(template => {
            const status = template.is_default ? '🌟 DEFAULT' : '📄';
            const active = template.is_active ? '✅' : '❌';
            console.log(`  ${status} ${active} ${template.name} (${template.category})`);
        });

        // Test 3: Test template selection by category
        console.log('\n3. Testing template selection by category...');

        const categories = ['welcome', 'interview', 'notification'];

        for (const category of categories) {
            console.log(`\n🔍 Testing category: ${category}`);

            // Get default template
            const defaultTemplate = await pool.query(`
        SELECT * FROM email_templates 
        WHERE category = $1 AND is_default = true AND is_active = true
      `, [category]);

            if (defaultTemplate.rows.length > 0) {
                console.log(`  ✅ Default template found: ${defaultTemplate.rows[0].name}`);
            } else {
                console.log(`  ⚠️  No default template for ${category}`);

                // Get any active template as fallback
                const anyTemplate = await pool.query(`
          SELECT * FROM email_templates 
          WHERE category = $1 AND is_active = true 
          ORDER BY created_at DESC 
          LIMIT 1
        `, [category]);

                if (anyTemplate.rows.length > 0) {
                    console.log(`  🔄 Fallback template found: ${anyTemplate.rows[0].name}`);
                } else {
                    console.log(`  ❌ No templates found for ${category}`);
                }
            }
        }

        // Test 4: Test unique constraint
        console.log('\n4. Testing unique constraint...');
        try {
            // Try to set multiple templates as default for the same category
            await pool.query(`
        UPDATE email_templates 
        SET is_default = true 
        WHERE category = 'welcome' AND name = 'client_welcome'
      `);

            const defaultCount = await pool.query(`
        SELECT COUNT(*) as count 
        FROM email_templates 
        WHERE category = 'welcome' AND is_default = true
      `);

            console.log(`  📊 Default templates in 'welcome' category: ${defaultCount.rows[0].count}`);

            if (defaultCount.rows[0].count <= 1) {
                console.log('  ✅ Unique constraint working correctly');
            } else {
                console.log('  ❌ Multiple default templates found - constraint not working');
            }
        } catch (error) {
            console.log('  ⚠️  Error testing constraint:', error.message);
        }

        console.log('\n🎉 Template selection system test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testTemplateSelection();
