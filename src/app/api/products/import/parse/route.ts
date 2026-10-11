import { ApiError, handler, requireApiShop } from "@/lib/api";
import { autoMap, parseImportFile } from "@/lib/import";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Step 1: upload a CSV/XLSX file → headers, rows and a suggested column mapping. */
export const POST = handler(async (req: Request) => {
  await requireApiShop();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "file_required");
  if (file.size > MAX_FILE_BYTES) throw new ApiError(413, "file_too_large", "Max 10 MB");
  try {
    const sheet = await parseImportFile(file);
    if (sheet.headers.length === 0) throw new ApiError(422, "empty_file", "No columns found");
    return Response.json({ ...sheet, mapping: autoMap(sheet.headers) });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.message === "unsupported_file") throw new ApiError(415, "unsupported_file", "Use .csv or .xlsx");
    throw new ApiError(422, "parse_failed", "Could not read the file");
  }
});
