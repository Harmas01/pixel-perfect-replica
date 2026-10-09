const SUPABASE_URL = "https://axtqkqicdcbmfobyvjhj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_g_quHAMm9Utcz33BJEfmMg_YnQG1QJM";
const GALLERY_SETTING_PREFIX = "gallery_image_";
const GALLERY_CACHE_KEY = "lucky-gallery-images";
const IMAGE_BUCKET = "salon-images";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type GalleryImageSlot = 1 | 2 | 3;
export const GALLERY_IMAGES_UPDATED_EVENT = "lucky-gallery-images-updated";

function apiHeaders(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
  };
}

function readCachedGalleryImages(): Array<string | null> {
  if (typeof window === "undefined") return [null, null, null];
  try {
    const stored = JSON.parse(window.localStorage.getItem(GALLERY_CACHE_KEY) || "[]");
    return [stored[0] || null, stored[1] || null, stored[2] || null];
  } catch {
    return [null, null, null];
  }
}

function cacheGalleryImages(images: Array<string | null>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(images.slice(0, 3)));
}

export async function fetchGalleryImageUrls(): Promise<Array<string | null>> {
  try {
    const keys = "(gallery_image_1,gallery_image_2,gallery_image_3)";
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?select=key,value&key=in.${keys}`,
      { headers: apiHeaders() },
    );
    if (!response.ok) return readCachedGalleryImages();

    const rows = (await response.json()) as Array<{ key: string; value: string }>;
    const images: Array<string | null> = [null, null, null];
    for (const row of rows) {
      const slot = Number(row.key.replace(GALLERY_SETTING_PREFIX, ""));
      if (slot >= 1 && slot <= 3) images[slot - 1] = row.value;
    }
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

export async function uploadGalleryImage(
  file: File,
  slot: GalleryImageSlot,
  accessToken: string,
) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Выберите изображение JPG, PNG или WebP");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Размер изображения не должен превышать 8 МБ");
  }

  const objectPath = `gallery-${slot}`;
  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        ...apiHeaders(accessToken),
        "Content-Type": file.type,
        "x-upsert": "true",
        "cache-control": "0",
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
        key: `${GALLERY_SETTING_PREFIX}${slot}`,
        value: publicUrl,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  await requireSuccessful(settingsResponse, "Не удалось сохранить фотографию галереи");

  const images = readCachedGalleryImages();
  images[slot - 1] = publicUrl;
  cacheGalleryImages(images);
  window.dispatchEvent(new CustomEvent(GALLERY_IMAGES_UPDATED_EVENT, { detail: images }));
  return publicUrl;
}
