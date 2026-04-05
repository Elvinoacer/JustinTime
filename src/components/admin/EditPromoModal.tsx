"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updatePromoCodeAction } from "@/app/actions/promo";
import { useRouter } from "next/navigation";

type EditablePromo = {
  id: string;
  code: string;
  description?: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number | string;
  minOrderAmount?: number | string | null;
  maxDiscountAmount?: number | string | null;
  usageLimit?: number | null;
  perUserLimit: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isActive: boolean;
};

interface EditPromoModalProps {
  promo: EditablePromo;
  disabled?: boolean;
}

function toDateTimeLocalValue(value?: Date | string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function convertDateTimeLocalToIso(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function normalizeFieldValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export function EditPromoModal({ promo, disabled = false }: EditPromoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("promoId", promo.id);

    const normalizedStartDate = convertDateTimeLocalToIso(
      formData.get("startDate"),
    );
    const normalizedEndDate = convertDateTimeLocalToIso(formData.get("endDate"));

    if (normalizedStartDate) {
      formData.set("startDate", normalizedStartDate);
    } else {
      formData.delete("startDate");
    }

    if (normalizedEndDate) {
      formData.set("endDate", normalizedEndDate);
    } else {
      formData.delete("endDate");
    }

    try {
      const result = await updatePromoCodeAction(formData);
      if (result.success) {
        toast.success("Promo code updated successfully");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update promo code");
      }
    } catch {
      toast.error("Failed to update promo code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Edit promo"
          disabled={disabled}
        >
          <Pencil className="w-4 h-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Edit Promo Code</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-code-${promo.id}`}>Code</Label>
              <Input
                id={`edit-code-${promo.id}`}
                name="code"
                defaultValue={promo.code}
                required
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-type-${promo.id}`}>Type</Label>
              <select
                id={`edit-type-${promo.id}`}
                name="type"
                defaultValue={promo.type}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (KES)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-value-${promo.id}`}>Discount Value</Label>
            <Input
              id={`edit-value-${promo.id}`}
              name="value"
              type="number"
              step="0.01"
              defaultValue={normalizeFieldValue(promo.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-min-order-${promo.id}`}>Min Order (Optional)</Label>
              <Input
                id={`edit-min-order-${promo.id}`}
                name="minOrder"
                type="number"
                defaultValue={normalizeFieldValue(promo.minOrderAmount)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-limit-${promo.id}`}>Usage Limit (Optional)</Label>
              <Input
                id={`edit-limit-${promo.id}`}
                name="limit"
                type="number"
                defaultValue={normalizeFieldValue(promo.usageLimit)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-max-discount-${promo.id}`}>Max Discount (Optional)</Label>
              <Input
                id={`edit-max-discount-${promo.id}`}
                name="maxDiscount"
                type="number"
                step="0.01"
                defaultValue={normalizeFieldValue(promo.maxDiscountAmount)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-per-user-limit-${promo.id}`}>Per User Limit</Label>
              <Input
                id={`edit-per-user-limit-${promo.id}`}
                name="perUserLimit"
                type="number"
                min="1"
                defaultValue={normalizeFieldValue(promo.perUserLimit)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-start-date-${promo.id}`}>Start Date</Label>
              <Input
                id={`edit-start-date-${promo.id}`}
                name="startDate"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(promo.startDate)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-end-date-${promo.id}`}>End Date (Optional)</Label>
              <Input
                id={`edit-end-date-${promo.id}`}
                name="endDate"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(promo.endDate)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-description-${promo.id}`}>Description</Label>
            <Input
              id={`edit-description-${promo.id}`}
              name="description"
              defaultValue={promo.description || ""}
              placeholder="Internal note or customer facing description"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={promo.isActive}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Promo is active
          </label>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
