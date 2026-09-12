require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'niboloda_super_secret_jwt_key_2026_nigeria_0 commission',
  SEARCH_RADIUS_KM: parseFloat(process.env.DEFAULT_SEARCH_RADIUS_KM || '15.0'),
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || 'sk_test_niboloda_mock_paystack',
  FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST_niboloda_mock',
  MONNIFY_SECRET_KEY: process.env.MONNIFY_SECRET_KEY || 'MK_TEST_niboloda_mock',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://qjidwqtwymzwvanknxue.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaWR3cXR3eW16d3ZhbmtueHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjY4ODYsImV4cCI6MjEwNDY0Mjg4Nn0.NZIuKa-uRbJBHycJdGePOWzk7c1MjmIAMTmHPEbQiDI',
};
