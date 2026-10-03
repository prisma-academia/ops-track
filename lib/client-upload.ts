import { apiPost } from "@/lib/client/api";

export async function uploadClientFile(file: File): Promise<string> {
  const sig = await apiPost<{
    uploadType: string;
    url: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    publicUrl?: string;
  }>("/api/tenant/upload/signature", { contentType: file.type });

  if (sig.error || !sig.data) {
    throw new Error(sig.error?.message ?? "Upload could not be started.");
  }

  let publicUrl = "";
  if (sig.data.uploadType === "cloudinary") {
    const formDataObj = new FormData();
    formDataObj.append("file", file);
    formDataObj.append("api_key", sig.data.apiKey);
    formDataObj.append("timestamp", sig.data.timestamp.toString());
    formDataObj.append("signature", sig.data.signature);
    const uploadRes = await fetch(sig.data.url, { method: "POST", body: formDataObj });
    if (!uploadRes.ok) throw new Error("Cloudinary upload failed.");
    const cloudinaryData = await uploadRes.json();
    publicUrl = cloudinaryData.secure_url;
  } else {
    const put = await fetch(sig.data.url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("Upload failed.");
    publicUrl = sig.data.publicUrl ?? "";
  }

  return publicUrl;
}
