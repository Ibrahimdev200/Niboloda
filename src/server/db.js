const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.qjidwqtwymzwvanknxue:%40Dherinosha1@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
}

const prisma = new PrismaClient();

module.exports = prisma;
