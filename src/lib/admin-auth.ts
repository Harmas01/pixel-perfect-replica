const SUPABASE_URL = "https://axtqkqicdcbmfobyvjhj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_g_quHAMm9Utcz33BJEfmMg_YnQG1QJM";
const ADMIN_EMAIL = "harmasbro@gmail.com";

const SESSION_STORAGE_KEY = "lucky-admin-auth-session-v2";
const LEGACY_SESSION_STORAGE_KEY = "lucky-admin-auth-session-v1";
const PENDING_MAGIC_LINK_KEY = "lucky-admin-pending-magic-link-v1";
const MAGIC_LINK_VALIDITY_MS = 15 * 60 * 1_000;

export const ADMIN_EMAIL_CONFIRMATION_ENABLED = false;

export type AdminAuthUser = {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
};

export type AdminAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  authenticated_on: string;
  user: AdminAuthUser;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: AdminAuthUser;
  message?: string;
  error?: string;
  error_description?: string;
  msg?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function authHeaders(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function readAuthResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as AuthResponse;
  if (!response.ok) {
    const rawMessage =
      payload.msg || payload.message || payload.error_description || payload.error || "Ошибка входа";
    const translations: Record<string, string> = {
      "Invalid login credentials": "Неверная почта или пароль",
      "Email not confirmed": "Сначала подтвердите почту по ссылке из письма",
      "User already registered": "Для этой почты пароль уже создан — выполните вход",
      "Password should be at least 6 characters": "Пароль должен содержать не менее 8 символов",
      "Signup requires a valid password": "Введите пароль не короче 8 символов",
      "Unable to validate email address: invalid format": "Проверьте правильность адреса почты",
      "Token has expired or is invalid": "Код неверный или срок его действия истёк",
      "Email rate limit exceeded": "Код уже отправлен. Подождите перед повторной отправкой",
    };
    throw new Error(translations[rawMessage] || rawMessage);
  }
  return payload;
}

function createSession(payload: AuthResponse): AdminAuthSession {
  if (!payload.access_token || !payload.refresh_token || !payload.user?.email) {
    throw new Error("Сервис входа вернул неполные данные");
  }
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at:
      payload.expires_at || Math.floor(Date.now() / 1000) + (payload.expires_in || 3600),
    authenticated_on: localDateKey(),
    user: payload.user,
  };
}

function saveSession(session: AdminAuthSession) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
}

function clearLegacySession() {
  window.sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
}

function savePendingMagicLink(email: string) {
  window.localStorage.setItem(
    PENDING_MAGIC_LINK_KEY,
    JSON.stringify({
      email: normalizeEmail(email),
      expiresAt: Date.now() + MAGIC_LINK_VALIDITY_MS,
    }),
  );
}

function readPendingMagicLink() {
  try {
    const raw = window.localStorage.getItem(PENDING_MAGIC_LINK_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as { email?: string; expiresAt?: number };
    if (
      pending.email !== ADMIN_EMAIL ||
      typeof pending.expiresAt !== "number" ||
      pending.expiresAt <= Date.now()
    ) {
      window.localStorage.removeItem(PENDING_MAGIC_LINK_KEY);
      return null;
    }
    return pending;
  } catch {
    window.localStorage.removeItem(PENDING_MAGIC_LINK_KEY);
    return null;
  }
}

function clearPendingMagicLink() {
  window.localStorage.removeItem(PENDING_MAGIC_LINK_KEY);
}

function readSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminAuthSession) : null;
  } catch {
    clearSession();
    return null;
  }
}

function ensureAllowedEmail(email: string) {
  if (normalizeEmail(email) !== ADMIN_EMAIL) {
    throw new Error("Для этой почты доступ к панели не разрешён");
  }
}

async function fetchCurrentUser(accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: authHeaders(accessToken),
  });
  const user = (await readAuthResponse(response)) as unknown as AdminAuthUser;
  if (!user.email) throw new Error("Не удалось определить пользователя");
  return user;
}

async function verifyAllowlist(session: AdminAuthSession) {
  ensureAllowedEmail(session.user.email);
  const queryEmail = encodeURIComponent(normalizeEmail(session.user.email));
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?select=email&email=eq.${queryEmail}`,
    { headers: authHeaders(session.access_token) },
  );
  if (!response.ok) {
    throw new Error("Не удалось проверить права администратора");
  }
  const rows = (await response.json()) as Array<{ email: string }>;
  if (rows.length !== 1 || normalizeEmail(rows[0].email) !== ADMIN_EMAIL) {
    throw new Error("У этой учётной записи нет прав администратора");
  }
}

async function refreshSession(session: AdminAuthSession) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const refreshedSession = createSession(await readAuthResponse(response));
  return { ...refreshedSession, authenticated_on: session.authenticated_on };
}

function adminRedirectUrl() {
  return new URL("admin", document.baseURI).toString();
}

async function sendAdminLoginCode(email: string) {
  const redirectTo = encodeURIComponent(adminRedirectUrl());
  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp?redirect_to=${redirectTo}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email: normalizeEmail(email),
      create_user: false,
    }),
  });
  await readAuthResponse(response);
}

async function consumeMagicLinkRedirect() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const authError = params.get("error_description");

  if (!ADMIN_EMAIL_CONFIRMATION_ENABLED && (accessToken || refreshToken || authError)) {
    clearPendingMagicLink();
    window.history.replaceState(null, "", window.location.pathname);
    return null;
  }

  if (!accessToken || !refreshToken) {
    if (authError) {
      window.history.replaceState(null, "", window.location.pathname);
      throw new Error(decodeURIComponent(authError));
    }
    return null;
  }

  const pending = readPendingMagicLink();
  if (!pending) {
    window.history.replaceState(null, "", window.location.pathname);
    throw new Error("Ссылка входа устарела. Введите почту и пароль ещё раз.");
  }

  const user = await fetchCurrentUser(accessToken);
  if (normalizeEmail(user.email) !== pending.email) {
    clearPendingMagicLink();
    window.history.replaceState(null, "", window.location.pathname);
    throw new Error("Ссылка входа предназначена для другой учётной записи.");
  }

  const session: AdminAuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1_000) + Number(params.get("expires_in") || 3_600),
    authenticated_on: localDateKey(),
    user,
  };
  await verifyAllowlist(session);
  saveSession(session);
  clearPendingMagicLink();
  window.history.replaceState(null, "", `${window.location.pathname}#appointments`);
  return session;
}

export async function getAuthorizedSession() {
  clearLegacySession();
  let session = await consumeMagicLinkRedirect();
  if (!session) session = readSession();
  if (!session) return null;
  if (session.authenticated_on !== localDateKey()) {
    clearSession();
    return null;
  }

  try {
    if (session.expires_at <= Math.floor(Date.now() / 1000) + 30) {
      session = await refreshSession(session);
    } else {
      session = { ...session, user: await fetchCurrentUser(session.access_token) };
    }
    await verifyAllowlist(session);
    saveSession(session);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export async function startAdminSignIn(email: string, password: string) {
  ensureAllowedEmail(email);
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email: normalizeEmail(email), password }),
  });
  const temporarySession = createSession(await readAuthResponse(response));
  await verifyAllowlist(temporarySession);

  if (!ADMIN_EMAIL_CONFIRMATION_ENABLED) {
    clearPendingMagicLink();
    saveSession(temporarySession);
    return {
      email: normalizeEmail(email),
      session: temporarySession,
    };
  }

  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: authHeaders(temporarySession.access_token),
  }).catch(() => undefined);

  savePendingMagicLink(email);
  try {
    await sendAdminLoginCode(email);
  } catch (error) {
    clearPendingMagicLink();
    throw error;
  }
  return {
    email: normalizeEmail(email),
    session: null,
  };
}

export async function resendAdminLoginCode(email: string) {
  ensureAllowedEmail(email);
  savePendingMagicLink(email);
  await sendAdminLoginCode(email);
}

export async function verifyAdminLoginCode(email: string, token: string) {
  ensureAllowedEmail(email);
  const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email: normalizeEmail(email),
      token: token.trim(),
      type: "email",
    }),
  });
  const session = createSession(await readAuthResponse(response));
  await verifyAllowlist(session);
  saveSession(session);
  clearPendingMagicLink();
  return session;
}

export async function signOutAdmin() {
  const session = readSession();
  clearSession();
  clearPendingMagicLink();
  if (!session) return;

  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: authHeaders(session.access_token),
  }).catch(() => undefined);
}
