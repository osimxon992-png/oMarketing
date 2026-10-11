"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, Link2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField, Input, Switch, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";

type Variant = { id?: string; size: string; color: string; price: number | null; stock: number; sku: string | null };
type Image = { id: string; url: string | null };
export type ProductFormValue = {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string | null;
  stock: number;
  active: boolean;
  variants: Variant[];
  images: Image[];
};

const toInt = (v: string) => {
  const n = Number(v.replace(/\s/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

export function ProductForm({ initial, categories }: { initial: ProductFormValue; categories: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((s) => ({ ...s, [k]: val }));
  const setVariant = (i: number, patch: Partial<Variant>) =>
    setV((s) => ({ ...s, variants: s.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      name: v.name,
      description: v.description,
      price: v.price,
      category: v.category,
      sku: v.sku || null,
      stock: v.stock,
      active: v.active,
      variants: v.variants.map((x) => ({ ...x, sku: x.sku || null })),
    };
    try {
      const res = await fetch(v.id ? `/api/products/${v.id}` : "/api/products", {
        method: v.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { product?: { id: string }; details?: { fieldErrors?: Record<string, string[]> } };
      if (!res.ok) {
        setErrors(data.details?.fieldErrors ?? {});
        toast(t.errors.validation, "error");
        return;
      }
      toast(t.common.saved);
      if (!v.id && data.product) router.replace(`/dashboard/products/${data.product.id}`);
      else router.refresh();
    } catch {
      toast(t.errors.generic, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!v.id) return;
    setDeleting(true);
    const res = await fetch(`/api/products/${v.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) return toast(t.errors.generic, "error");
    toast(t.products.deleted);
    router.push("/dashboard/products");
    router.refresh();
  }

  async function uploadFiles(files: FileList | null) {
    if (!v.id || !files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/products/${v.id}/images`, { method: "POST", body: fd });
      const data = (await res.json()) as { image?: Image; message?: string };
      if (res.ok && data.image) setV((s) => ({ ...s, images: [...s.images, data.image!] }));
      else toast(data.message ?? t.errors.generic, "error");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function addUrl() {
    if (!v.id || !photoUrl) return;
    const res = await fetch(`/api/products/${v.id}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: photoUrl }),
    });
    const data = (await res.json()) as { image?: Image; message?: string };
    if (res.ok && data.image) {
      setV((s) => ({ ...s, images: [...s.images, data.image!] }));
      setPhotoUrl("");
    } else toast(data.message ?? t.errors.generic, "error");
  }

  async function removeImage(id: string) {
    const res = await fetch(`/api/products/${v.id}/images/${id}`, { method: "DELETE" });
    if (res.ok) setV((s) => ({ ...s, images: s.images.filter((i) => i.id !== id) }));
    else toast(t.errors.generic, "error");
  }

  const err = (k: string) => errors[k]?.[0];

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="space-y-4">
          <FormField label={t.products.name} error={err("name")}>
            {(id, d) => <Input id={id} aria-describedby={d} value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={200} />}
          </FormField>
          <FormField label={t.products.description} error={err("description")}>
            {(id, d) => (
              <Textarea id={id} aria-describedby={d} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} rows={5} />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.products.price} error={err("price")}>
              {(id, d) => (
                <Input id={id} aria-describedby={d} inputMode="numeric" value={v.price || ""} onChange={(e) => set("price", toInt(e.target.value))} required />
              )}
            </FormField>
            <FormField label={t.products.category} error={err("category")}>
              {(id, d) => (
                <>
                  <Input id={id} aria-describedby={d} list="categories" value={v.category} onChange={(e) => set("category", e.target.value)} maxLength={100} />
                  <datalist id="categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              )}
            </FormField>
            <FormField label={t.products.sku} error={err("sku")}>
              {(id, d) => <Input id={id} aria-describedby={d} value={v.sku ?? ""} onChange={(e) => set("sku", e.target.value)} maxLength={64} />}
            </FormField>
            <FormField label={t.products.stock} error={err("stock")} hint={v.variants.length ? t.products.variantsHint : undefined}>
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  inputMode="numeric"
                  value={v.variants.length ? v.variants.reduce((s, x) => s + x.stock, 0) : v.stock}
                  onChange={(e) => set("stock", toInt(e.target.value))}
                  disabled={v.variants.length > 0}
                />
              )}
            </FormField>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t.products.variants}
            description={t.products.variantsHint}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => set("variants", [...v.variants, { size: "", color: "", price: null, stock: 0, sku: null }])}
              >
                <Plus className="h-4 w-4" /> {t.products.addVariant}
              </Button>
            }
          />
          {v.variants.length > 0 && (
            <div className="space-y-2">
              {v.variants.map((x, i) => (
                <div key={x.id ?? `new-${i}`} className="grid grid-cols-2 gap-2 rounded-2xl bg-glass p-2 sm:grid-cols-[1fr_1fr_1fr_90px_auto]">
                  <Input aria-label={t.products.size} placeholder={t.products.size} value={x.size} onChange={(e) => setVariant(i, { size: e.target.value })} maxLength={40} />
                  <Input aria-label={t.products.color} placeholder={t.products.color} value={x.color} onChange={(e) => setVariant(i, { color: e.target.value })} maxLength={40} />
                  <Input
                    aria-label={t.products.variantPrice}
                    placeholder={t.products.variantPrice}
                    inputMode="numeric"
                    value={x.price ?? ""}
                    onChange={(e) => setVariant(i, { price: e.target.value.trim() === "" ? null : toInt(e.target.value) })}
                  />
                  <Input aria-label={t.products.stock} placeholder={t.products.stock} inputMode="numeric" value={x.stock} onChange={(e) => setVariant(i, { stock: toInt(e.target.value) })} />
                  <Button variant="ghost" size="sm" className="h-10" onClick={() => set("variants", v.variants.filter((_, j) => j !== i))} aria-label={t.common.delete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="flex items-center justify-between">
          <span className="font-medium text-fg">{v.active ? t.common.active : t.common.inactive}</span>
          <Switch checked={v.active} onChange={(val) => set("active", val)} label={t.products.status} />
        </Card>

        <Card>
          <CardHeader title={t.products.photos} description={t.products.photosHint} />
          {!v.id ? (
            <p className="text-sm text-muted">{t.products.saveFirst}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {v.images.map((img) => (
                  <div key={img.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url ?? `/api/media/${img.id}`} alt="" className="aspect-square w-full rounded-xl object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-90 hover:bg-red-600"
                      aria-label={t.common.delete}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
              <Button variant="secondary" className="mt-3 w-full" onClick={() => fileRef.current?.click()} loading={uploading} disabled={v.images.length >= 8}>
                <ImagePlus className="h-4 w-4" /> {t.products.uploadPhoto}
              </Button>
              <div className="mt-2 flex gap-2">
                <Input aria-label={t.products.photoUrl} placeholder={t.products.photoUrl} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                <Button variant="secondary" onClick={addUrl} disabled={!photoUrl.startsWith("https://")} aria-label={t.products.addUrl}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" size="lg" loading={saving}>
            {t.common.save}
          </Button>
          {v.id && (
            <ConfirmButton variant="secondary" size="lg" onConfirm={remove} loading={deleting} confirmLabel={t.common.yes + '?'} aria-label={t.common.delete}>
              <Trash2 className="h-4 w-4" />
            </ConfirmButton>
          )}
        </div>
      </div>
    </form>
  );
}
