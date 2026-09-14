const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('../config');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_ANON_KEY is missing.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
});

/**
 * Dispatches a real OTP verification code to the user's email via Supabase Auth
 */
async function sendSupabaseEmailOtp(email, otpCode) {
  if (!email) return { success: false, error: 'No email provided' };
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          otp_code: otpCode,
          code: otpCode,
          confirmation_code: otpCode
        }
      }
    });
    if (error) {
      console.error('[Supabase Auth] Error sending email OTP:', error.message);
      return { success: false, error: error.message };
    }
    console.log(`[Supabase Auth] Successfully dispatched 4-digit OTP code (${otpCode || 'generated'}) to ${email}`);
    return { success: true, data };
  } catch (err) {
    console.error('[Supabase Auth] Exception sending OTP:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches a password reset email via Supabase Auth
 */
async function sendSupabasePasswordReset(email) {
  if (!email) return { success: false, error: 'No email provided' };
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      console.error('[Supabase Auth] Error sending password reset:', error.message);
      return { success: false, error: error.message };
    }
    console.log(`[Supabase Auth] Successfully dispatched password reset to ${email}`);
    return { success: true, data };
  } catch (err) {
    console.error('[Supabase Auth] Exception sending password reset:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verifies Supabase OTP token
 */
async function verifySupabaseOtp(email, token, type = 'email') {
  if (!email || !token) return { success: false, error: 'Email and token required' };
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, session: data.session, user: data.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  supabase,
  sendSupabaseEmailOtp,
  sendSupabasePasswordReset,
  verifySupabaseOtp
};
