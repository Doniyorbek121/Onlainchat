/** Accept only reasonably-sized base64 image data URLs; anything else → "". */
export function validAvatarImage(v: unknown): string {
  if (typeof v !== "string") return "";
  if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(v)) return "";
  if (v.length > 400_000) return ""; // ~300KB cap
  return v;
}
