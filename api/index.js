if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:%40Dherinosha1@db.qjidwqtwymzwvanknxue.supabase.co:5432/postgres?connect_timeout=30";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "niboloda_super_secret_jwt_key_2026_nigeria_0commission";
}

const app = require('../src/server/app');

module.exports = (req, res) => {
  try {
    return app(req, res);
  } catch (err) {
    console.error('Vercel Serverless Function Error:', err);
    return res.status(500).json({ error: err.message || 'Vercel Function Error' });
  }
};
