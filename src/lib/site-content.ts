const SUPABASE_URL = "https://axtqkqicdcbmfobyvjhj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_g_quHAMm9Utcz33BJEfmMg_YnQG1QJM";
const GALLERY_SETTING_PREFIX = "gallery_image_";
const GALLERY_CACHE_KEY = "lucky-gallery-images";
const IMAGE_BUCKET = "salon-images";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type GalleryImageItem = {
  id: string;
  url: string;
};
export const GALLERY_IMAGES_UPDATED_EVENT = "lucky-gallery-images-updated";

function apiHeaders(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
  };
}

function readCachedGalleryImages(): GalleryImageItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(GALLERY_CACHE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .map((item, index) => {
        if (typeof item === "string" && item) return { id: `legacy-${index + 1}`, url: item };
        if (item && typeof item.url === "string" && typeof item.id === "string") return item;
        return null;
      })
      .filter((item): item is GalleryImageItem => Boolean(item?.url && item.id));
  } catch {
    return [];
  }
}

function cacheGalleryImages(images: GalleryImageItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(images));
}

export async function fetchGalleryImageUrls(): Promise<GalleryImageItem[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?select=key,value&key=like.gallery_image_*&order=key.asc`,
      { headers: apiHeaders() },
    );
    if (!response.ok) return readCachedGalleryImages();

    const rows = (await response.json()) as Array<{ key: string; value: string }>;
    const images = rows
      .filter((row) => row.key.startsWith(GALLERY_SETTING_PREFIX) && row.value)
      .map((row) => ({
        id: row.key.slice(GALLERY_SETTING_PREFIX.length),
        url: row.value,
      }));
    cacheGalleryImages(images);
    return images;
  } catch {
    return readCachedGalleryImages();
  }
}

async function requireSuccessful(response: Response, fallbackMessage: string) {
  if (response.ok) return;
  const payload = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | null;
  throw new Error(payload?.message || payload?.error || fallbackMessage);
}

export async function uploadGalleryImage(file: File, accessToken: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Выберите изображение JPG, PNG или WebP");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Размер изображения не должен превышать 8 МБ");
  }

  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const id = `${Date.now()}-${randomId}`;
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] || "img";
  const objectPath = `gallery/${id}.${extension}`;
  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${objectPath.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        ...apiHeaders(accessToken),
        "Content-Type": file.type,
        "x-upsert": "false",
        "cache-control": "31536000",
      },
      body: file,
    },
  );
  await requireSuccessful(uploadResponse, "Не удалось загрузить фотографию");

  const publicUrl =
    `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${objectPath}?v=${Date.now()}`;
  const settingsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/site_settings?on_conflict=key`,
    {
      method: "POST",
      headers: {
        ...apiHeaders(accessToken),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        key: `${GALLERY_SETTING_PREFIX}${id}`,
        value: publicUrl,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  await requireSuccessful(settingsResponse, "Не удалось сохранить фотографию галереи");

  const item = { id, url: publicUrl };
  const images = [...readCachedGalleryImages(), item];
  cacheGalleryImages(images);
  window.dispatchEvent(new CustomEvent(GALLERY_IMAGES_UPDATED_EVENT, { detail: images }));
  return item;
}

function getStorageObjectPath(url: string) {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) throw new Error("Не удалось определить файл галереи");
  return decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
}

export async function deleteGalleryImage(item: GalleryImageItem, accessToken: string) {
  const settingKey = `${GALLERY_SETTING_PREFIX}${item.id}`;
  const settingsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/site_settings?key=eq.${encodeURIComponent(settingKey)}`,
    {
      method: "DELETE",
      headers: {
        ...apiHeaders(accessToken),
        Prefer: "return=minimal",
      },
    },
  );
  await requireSuccessful(settingsResponse, "Не удалось удалить фотографию из галереи");

  const objectPath = getStorageObjectPath(item.url);
  const storageResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${objectPath.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "DELETE",
      headers: apiHeaders(accessToken),
    },
  );
  await requireSuccessful(storageResponse, "Фотография убрана из галереи, но файл не удалён из хранилища");

  const images = readCachedGalleryImages().filter((image) => image.id !== item.id);
  cacheGalleryImages(images);
  window.dispatchEvent(new CustomEvent(GALLERY_IMAGES_UPDATED_EVENT, { detail: images }));
}