"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { createTeam } from "@/app/actions/team";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateTeamButton() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);
    try {
      const result = await createTeam(name);
      if (result.success) {
        toast.success("Team created successfully!");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create team");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105"
        >
          <Zap className="mr-2 h-5 w-5" />
          Create Agency Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name Your Agency</DialogTitle>
          <DialogDescription>
            This name will be visible to your team members.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Agency Name</label>
            <Input
              placeholder="e.g., Elite Cleaners Crew"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              "Create Team"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
