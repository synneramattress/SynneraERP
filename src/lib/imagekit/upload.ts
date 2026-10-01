import { auth } from "@/lib/firebase/client";

export interface ImageKitUploadResult {
  fileId: string;
  url: string;
  name: string;
  filePath?: string;
  thumbnailUrl?: string;
}

export async function uploadImageToImageKit(file: File, folder = "/synnera/designs") {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Please sign in again before uploading.");

  // Always request a brand-new one-time ImageKit auth token (never reuse)
  const idToken = await firebaseUser.getIdToken();
  const authResponse = await fetch(`/api/imagekit-auth?t=${Date.now()}-${Math.random()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    cache: "no-store",
  });

  if (!authResponse.ok) {
    const body = await authResponse.json().catch(() => ({}));
    throw new Error(body.error || "Unable to authorize ImageKit upload.");
  }

  const authParams = await authResponse.json();
  if (!authParams.token || !authParams.signature || !authParams.publicKey) {
    throw new Error("Invalid ImageKit auth response. Please try again.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("fileName", `${Date.now()}-${file.name || "photo.jpg"}`);
  form.append("publicKey", authParams.publicKey);
  const expireValue = Number(authParams.expire);
  if (!Number.isFinite(expireValue) || expireValue < Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid ImageKit expire from server. Redeploy the app or check API route.");
  }
  form.append("token", authParams.token);
  form.append("expire", String(Math.floor(expireValue)));
  form.append("signature", authParams.signature);
  form.append("useUniqueFileName", "true");
  form.append("folder", folder);

  const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: form,
  });

  const result = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok) {
    throw new Error(result.message || "ImageKit upload failed.");
  }

  return result as ImageKitUploadResult;
}
