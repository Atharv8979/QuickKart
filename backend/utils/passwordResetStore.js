import { supabase } from '../config/supabase.js';

const TABLE = 'password_reset_codes';

// In-memory fallback, used when Supabase is unavailable OR the migration has
// not been applied yet. Mirrors the app's existing "resilient fallback" mode.
const memory = new Map(); // email -> record

let forceMemory = false;
let warnedMissingTable = false;

const noteMissingTable = (error) => {
  // 42P01 = undefined_table, PGRST205 = table missing from PostgREST schema cache
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    forceMemory = true;
    if (!warnedMissingTable) {
      warnedMissingTable = true;
      console.warn(
        '[PasswordReset] Table "password_reset_codes" not found. Using in-memory storage. ' +
          'Run backend/migrations/password_reset_codes.sql in Supabase to persist codes across restarts.'
      );
    }
    return true;
  }
  return false;
};

export const isPersistenceAvailable = () => Boolean(supabase) && !forceMemory;

const nowIso = () => new Date().toISOString();

const pruneMemory = () => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [email, rec] of memory) {
    if (new Date(rec.created_at).getTime() < cutoff) memory.delete(email);
  }
};

/** Voids every code previously issued for an email. */
export const invalidateAllCodes = async (email) => {
  if (isPersistenceAvailable()) {
    try {
      const { error } = await supabase.from(TABLE).delete().eq('email', email);
      if (!error) return true;
      if (!noteMissingTable(error)) console.warn('[PasswordReset] invalidateAllCodes:', error.message);
    } catch (err) {
      if (!noteMissingTable(err)) console.warn('[PasswordReset] invalidateAllCodes:', err.message);
    }
  }
  memory.delete(email);
  return true;
};

/** Returns the newest code record for an email (any state), or null. */
export const getLatestCode = async (email) => {
  if (isPersistenceAvailable()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error) return data || null;
      if (!noteMissingTable(error)) console.warn('[PasswordReset] getLatestCode:', error.message);
    } catch (err) {
      if (!noteMissingTable(err)) console.warn('[PasswordReset] getLatestCode:', err.message);
    }
  }
  return memory.get(email) || null;
};

/** Persists a freshly generated (already hashed) code, replacing any prior ones. */
export const createCode = async ({ email, codeHash, ttlMinutes, maxAttempts = 5, requestIp }) => {
  await invalidateAllCodes(email);
  pruneMemory();

  const record = {
    email,
    code_hash: codeHash,
    expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    attempts: 0,
    max_attempts: maxAttempts,
    used_at: null,
    request_ip: requestIp || null,
  };

  if (isPersistenceAvailable()) {
    try {
      const { data, error } = await supabase.from(TABLE).insert([record]).select().single();
      if (!error && data) return data;
      if (!noteMissingTable(error)) console.warn('[PasswordReset] createCode:', error?.message);
    } catch (err) {
      if (!noteMissingTable(err)) console.warn('[PasswordReset] createCode:', err.message);
    }
  }

  const stored = { id: `mem-${Date.now()}`, ...record, created_at: nowIso() };
  memory.set(email, stored);
  return stored;
};

/** Bumps the failed-attempt counter and returns the new value. */
export const incrementAttempts = async (record) => {
  const next = (record.attempts || 0) + 1;

  if (isPersistenceAvailable() && record.id && !String(record.id).startsWith('mem-')) {
    try {
      const { error } = await supabase.from(TABLE).update({ attempts: next }).eq('id', record.id);
      if (!error) return next;
      if (!noteMissingTable(error)) console.warn('[PasswordReset] incrementAttempts:', error.message);
    } catch (err) {
      if (!noteMissingTable(err)) console.warn('[PasswordReset] incrementAttempts:', err.message);
    }
  }

  if (memory.has(record.email)) memory.get(record.email).attempts = next;
  return next;
};

/** Marks a code as consumed so it can never be replayed. */
export const markCodeUsed = async (record) => {
  if (isPersistenceAvailable() && record.id && !String(record.id).startsWith('mem-')) {
    try {
      const { error } = await supabase.from(TABLE).update({ used_at: nowIso() }).eq('id', record.id);
      if (!error) return true;
      if (!noteMissingTable(error)) console.warn('[PasswordReset] markCodeUsed:', error.message);
    } catch (err) {
      if (!noteMissingTable(err)) console.warn('[PasswordReset] markCodeUsed:', err.message);
    }
  }

  if (memory.has(record.email)) memory.get(record.email).used_at = nowIso();
  return true;
};
