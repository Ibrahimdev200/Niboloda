if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.qjidwqtwymzwvanknxue:%40Dherinosha1@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "niboloda_super_secret_jwt_key_2026_nigeria_0commission";
}

const app = require('../src/server/app');

module.exports = app;
