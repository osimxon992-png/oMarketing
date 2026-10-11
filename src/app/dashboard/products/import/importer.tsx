"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert, Badge, Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";
import { formatUzs } from "@/lib/utils/format";

const FIELDS = ["name", "description", "price", "category", "stock", "sku", "size", "color", "photo_url", "active"] as const;
type Field = (typeof FIELDS)[number];
type Sheet = { headers: string[]; rows: Record<string, string>[]; mapping: Partial<Record<Field, string>> };
type Validation = {
  rowCount: number;
  productCount: number;
  variantCount: number;
  errorCount: number;
  errors: { row: number; field: string; message: string }[];
  preview: { name: string; price: number; category: string; stock: number; variants: number; photos: number }[];
};

export function Importer() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<Field, string>>>({});
  const [validation, setValidation] = useState<Validation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setValidation(null);
    setDone(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/products/import/parse", { method: "POST", body: fd });
      const data = (await res.json()) as Sheet & { message?: string };
      if (!res.ok) return setError(data.message ?? t.errors.generic);
      setSheet(data);
      setMapping(data.mapping);
    } catch {
      setError(t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  async function run(dryRun: boolean) {
    if (!sheet) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping, rows: sheet.rows, dryRun }),
      });
      const data = (await res.json()) as Validation & { created?: number; dryRun: boolean; message?: string };
      if (!res.ok) return setError(data.message ?? t.errors.generic);
      if (dryRun) setValidation(data);
      else {
        setDone(data.created ?? 0);
        router.refresh();
      }
    } catch {
      setError(t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  if (done !== null) {
    return (
      <Card className="flex flex-col items-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <p className="mt-3 text-lg font-semibold text-fg">
          {t.importer.done} {done} {t.importer.productsLabel}
        </p>
        <Link href="/dashboard/products" className={buttonClass("primary", "md", "mt-5")}>
          {t.products.title}
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={`1. ${t.importer.step1}`}
          description={t.importer.fileHint}
          action={
            <a href="/api/products/import/template" className={buttonClass("ghost", "sm")}>
              <Download className="h-4 w-4" /> {t.importer.template}
            </a>
          }
        />
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={busy && !sheet}>
          <FileSpreadsheet className="h-4 w-4" /> {t.importer.chooseFile}
        </Button>
        {sheet && (
          <span className="ml-3 text-sm text-muted">
            {sheet.rows.length} {t.importer.rows}
          </span>
        )}
      </Card>

      {error && <Alert tone="danger">{error}</Alert>}

      {sheet && (
        <Card>
          <CardHeader title={`2. ${t.importer.step2}`} />
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-muted">{t.importer.fields[f]}</span>
                <Select
                  value={mapping[f] ?? ""}
                  onChange={(e) => {
                    setValidation(null);
                    setMapping((m) => ({ ...m, [f]: e.target.value || undefined }));
                  }}
                >
                  <option value="">{t.importer.notMapped}</option>
                  {sheet.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
          </div>
          <Button className="mt-4" onClick={() => run(true)} loading={busy} disabled={!mapping.name || !mapping.price}>
            {t.importer.validate}
          </Button>
        </Card>
      )}

      {validation && (
        <Card>
          <CardHeader title={`3. ${t.importer.step3}`} />
          <p className="text-sm text-fg">
            {t.importer.willCreate} <b>{validation.productCount}</b> {t.importer.productsLabel}, <b>{validation.variantCount}</b>{" "}
            {t.importer.variantsLabel}
          </p>
          {validation.preview.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs text-subtle">
                  <tr>
                    <th className="py-2 pr-3 font-medium">{t.products.name}</th>
                    <th className="py-2 pr-3 font-medium">{t.products.category}</th>
                    <th className="py-2 pr-3 font-medium">{t.products.price}</th>
                    <th className="py-2 pr-3 font-medium">{t.products.stock}</th>
                    <th className="py-2 font-medium">{t.products.variants}</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.preview.map((p, i) => (
                    <tr key={i} className="border-t border-line text-fg">
                      <td className="py-2 pr-3">{p.name}</td>
                      <td className="py-2 pr-3 text-muted">{p.category || "—"}</td>
                      <td className="py-2 pr-3">{formatUzs(p.price, locale)}</td>
                      <td className="py-2 pr-3">{p.stock}</td>
                      <td className="py-2">{p.variants || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {validation.errorCount > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-danger">
                {t.importer.errorsLabel}: {validation.errorCount}
              </p>
              <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                {validation.errors.map((e, i) => (
                  <li key={i} className="flex gap-2 text-muted">
                    <Badge tone="danger">
                      {t.importer.row} {e.row}
                    </Badge>
                    <span>
                      {e.field}: {e.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button className="mt-4" size="lg" onClick={() => run(false)} loading={busy} disabled={validation.productCount === 0}>
            {t.importer.commit} ({validation.productCount})
          </Button>
        </Card>
      )}
    </div>
  );
}
