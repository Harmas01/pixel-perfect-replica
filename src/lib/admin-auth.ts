const SUPABASE_URL = "https://axtqkqicdcbmfobyvjhj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_g_quHAMm9Utcz33BJEfmMg_YnQG1QJM";
const ADMIN_EMAIL = "harmasbro@gmail.com";

const SESSION_STORAGE_KEY = "lucky-admin-auth-session-v1";

export type AdminAuthUser = {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
};

export type AdminAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
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
    user: payload.user,
  };
}

function saveSession(session: AdminAuthSession) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
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
  return createSession(await readAuthResponse(response));
}

async function consumeEmailRedirect() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  const user = await fetchCurrentUser(accessToken);
  const session: AdminAuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at:
      Math.floor(Date.now() / 1000) + Number(params.get("expires_in") || 3600),
    user,
  };
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#appointments`);
  return session;
}

export async function getAuthorizedSession() {
  let session = await consumeEmailRedirect();
  if (!session) session = readSession();
  if (!session) return null;

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

export async function signInAdmin(email: string, password: string) {
  ensureAllowedEmail(email);
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email: normalizeEmail(email), password }),
  });
  const session = createSession(await readAuthResponse(response));
  await verifyAllowlist(session);
  saveSession(session);
  return session;
}

export async function signOutAdmin() {
  const session = readSession();
  clearSession();
  if (!session) return;

  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: authHeaders(session.access_token),
  }).catch(() => undefined);
}
