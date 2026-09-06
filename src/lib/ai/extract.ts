import { extractText } from "unpdf";

export async function extractFileText(
  buffer: ArrayBuffer,
  mimeType: string | null,
  fileName: string,
): Promise<string> {
  const mime = (mimeType ?? "").toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (
    mime.startsWith("text/") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".txt")
  ) {
    return new TextDecoder().decode(buffer);
  }

  if (mime === "application/pdf" || lowerName.endsWith(".pdf")) {
    const { text } = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    return Array.isArray(text) ? text.join("\n\n") : String(text ?? "");
  }

  if (mime.startsWith("image/")) {
    return "";
  }

  throw new Error(`Tipo de archivo no soportado: ${mime || fileName}`);
}
