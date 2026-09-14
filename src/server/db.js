const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:%40Dherinosha1@db.qjidwqtwymzwvanknxue.supabase.co:5432/postgres?connect_timeout=30";
}

const prisma = new PrismaClient();

module.exports = prisma;
