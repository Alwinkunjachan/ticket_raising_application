/**
 * Sprintly - Database Migration Script
 *
 * This script creates the database, all tables, and seeds initial data.
 * It is idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx ts-node scripts/migrate.ts
 *
 * Prerequisites:
 *   - PostgreSQL running
 *   - .env file configured with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
 *   - The DB_USER must have permission to create databases
 */

import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'sprintly';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'alwin.kunjachan@zeronorth.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Alwin Kunjachan';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

async function run() {
  console.log('=== Sprintly Database Migration ===\n');

  // ── Step 1: Create database if it doesn't exist ──────────────────────
  console.log(`[1/4] Checking database "${DB_NAME}"...`);
  const rootConn = new Sequelize('postgres', DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
  });

  try {
    const result = await rootConn.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM pg_database WHERE datname = $1',
      { bind: [DB_NAME], type: QueryTypes.SELECT }
    );
    if (parseInt(result[0].count, 10) === 0) {
      // Database names can't be parameterized — validate format instead
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(DB_NAME)) {
        throw new Error(`Invalid database name: ${DB_NAME}`);
      }
      await rootConn.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`  ✓ Created database "${DB_NAME}"`);
    } else {
      console.log(`  ✓ Database "${DB_NAME}" already exists`);
    }
  } finally {
    await rootConn.close();
  }

  // ── Step 2: Connect and create all tables ────────────────────────────
  console.log(`[2/4] Creating tables...`);
  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
  });

  await sequelize.authenticate();

  // Create ENUM types
  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_issues_status AS ENUM (
        'backlog', 'todo', 'in_progress', 'ready_to_test',
        'testing_in_progress', 'done', 'cancelled'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_issues_priority AS ENUM (
        'urgent', 'high', 'medium', 'low', 'none'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_cycles_status AS ENUM (
        'upcoming', 'active', 'completed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // ── members ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      avatar_url VARCHAR(500),
      password_hash VARCHAR(255),
      google_id VARCHAR(255) UNIQUE,
      provider VARCHAR(50) NOT NULL DEFAULT 'local',
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      blocked BOOLEAN NOT NULL DEFAULT false,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      blocked_reason VARCHAR(50),
      blocked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ members');

  // ── projects ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      identifier VARCHAR(5) NOT NULL UNIQUE,
      description TEXT,
      issue_counter INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ projects');

  // ── cycles ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS cycles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status enum_cycles_status NOT NULL DEFAULT 'upcoming',
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ cycles');

  // ── issues ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS issues (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      identifier VARCHAR(20) NOT NULL UNIQUE,
      number INTEGER NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      status enum_issues_status NOT NULL DEFAULT 'backlog',
      priority enum_issues_priority NOT NULL DEFAULT 'none',
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      assignee_id UUID REFERENCES members(id) ON DELETE SET NULL,
      cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS issues_project_id_number ON issues (project_id, number);
  `);
  console.log('  ✓ issues');

  // ── labels ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS labels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      color VARCHAR(7) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ labels');

  // ── issue_labels (junction) ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS issue_labels (
      issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (issue_id, label_id)
    );
  `);
  console.log('  ✓ issue_labels');

  // ── Step 3: Seed admin user ──────────────────────────────────────────
  console.log(`[3/4] Seeding admin user...`);
  const [adminRows] = await sequelize.query(
    'SELECT id FROM members WHERE email = $1',
    { bind: [ADMIN_EMAIL] }
  );
  if ((adminRows as any[]).length === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await sequelize.query(
      `INSERT INTO members (id, name, email, password_hash, provider, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'local', 'admin', NOW(), NOW())`,
      { bind: [ADMIN_NAME, ADMIN_EMAIL, hash] }
    );
    console.log(`  ✓ Created admin user: ${ADMIN_EMAIL}`);
  } else {
    console.log(`  ✓ Admin user already exists`);
  }

  // ── Step 4: Seed labels ──────────────────────────────────────────────
  console.log(`[4/4] Seeding labels...`);
  const labels = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#3B82F6' },
    { name: 'Improvement', color: '#8B5CF6' },
    { name: 'Design', color: '#F59E0B' },
    { name: 'Documentation', color: '#10B981' },
    { name: 'Performance', color: '#F97316' },
    { name: 'Security', color: '#DC2626' },
    { name: 'Testing', color: '#14B8A6' },
  ];

  let seededCount = 0;
  for (const label of labels) {
    const [existing] = await sequelize.query(
      'SELECT id FROM labels WHERE name = $1',
      { bind: [label.name] }
    );
    if ((existing as any[]).length === 0) {
      await sequelize.query(
        `INSERT INTO labels (id, name, color, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())`,
        { bind: [label.name, label.color] }
      );
      seededCount++;
    }
  }
  if (seededCount > 0) {
    console.log(`  ✓ Seeded ${seededCount} label(s)`);
  } else {
    console.log(`  ✓ All labels already exist`);
  }

  await sequelize.close();

  console.log('\n=== Migration complete ===');
  console.log(`Database: ${DB_NAME}`);
  console.log(`Tables: members, projects, cycles, issues, labels, issue_labels`);
  console.log(`Admin: ${ADMIN_EMAIL}`);
}

run().catch((err) => {
  console.error('\n✗ Migration failed:', err.message);
  process.exit(1);
});
