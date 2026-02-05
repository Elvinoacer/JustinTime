"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPromoCodeAction } from "@/app/actions/promo"; 

export function CreatePromoModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
        const result = await createPromoCodeAction(formData);
        if (result.success) {
            toast.success("Promo code created successfully");
            setOpen(false);
            // Ideally revalidatePath or router.refresh() 
            window.location.reload(); 
        } else {
            toast.error(result.error);
        }
    } catch (err) {
        toast.error("Failed to create promo code");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Create Promo
         </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Promo Code</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input id="code" name="code" placeholder="e.g. SUMMER25" required className="uppercase" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select 
                        id="type" 
                        name="type" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                    >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED_AMOUNT">Fixed Amount (KES)</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="value">Discount Value</Label>
                <Input id="value" name="value" type="number" step="0.01" placeholder="20" required />
                <p className="text-xs text-muted-foreground">Enter percentage (0-100) or fixed amount in KES</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="minOrder">Min Order (Optional)</Label>
                    <Input id="minOrder" name="minOrder" type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="limit">Usage Limit (Optional)</Label>
                    <Input id="limit" name="limit" type="number" placeholder="∞" />
                </div>
            </div>

             <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Internal note or customer facing description" />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Promo
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
