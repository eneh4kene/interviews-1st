const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pi8PbIqt5WSD@ep-purple-silence-ad2u8w9w-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');
    
    // Hash the password
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@interviewsfirst.com']
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Create admin user
    const result = await pool.query(`
      INSERT INTO users (email, name, role, password_hash, is_active, two_factor_enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, role
    `, [
      'admin@interviewsfirst.com',
      'System Administrator',
      'ADMIN',
      passwordHash,
      true,
      false
    ]);
    
    console.log('✅ Admin user created successfully:');
    console.log(`   Email: admin@interviewsfirst.com`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ADMIN`);
    console.log(`   ID: ${result.rows[0].id}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();
