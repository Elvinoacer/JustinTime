"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addMemberToMyTeam } from "@/app/actions/team";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TeamPermission, DEFAULT_MEMBER_PERMISSIONS } from "@/lib/permissions";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERMISSION_LABELS: Record<string, string> = {
  [TeamPermission.VIEW_BOOKINGS]: "View Bookings (Read-only)",
  [TeamPermission.MANAGE_BOOKINGS]: "Manage Bookings (Accept/Reject)",
  [TeamPermission.VIEW_MESSAGES]: "View Messages",
  [TeamPermission.REPLY_MESSAGES]: "Reply to Messages",
  [TeamPermission.VIEW_FINANCIALS]: "View Financials",
  [TeamPermission.MANAGE_SERVICES]: "Manage Services",
};

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    DEFAULT_MEMBER_PERMISSIONS,
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const result = await addMemberToMyTeam(
        email,
        "MEMBER",
        selectedPermissions,
      );
      if (result.success) {
        toast.success(result.message || "Invitation sent successfully!");
        setEmail("");
        setSelectedPermissions(DEFAULT_MEMBER_PERMISSIONS);
        router.refresh();
        onClose();
      } else {
        const actionError =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Invite failed";
        toast.error(actionError);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Invite a crew member or subcontractor to your team. They must accept
            the invitation before joining.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="grid grid-cols-1 gap-2 border rounded-lg p-3 max-h-60 overflow-y-auto">
              {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                <div key={perm} className="flex items-center space-x-2">
                  <Checkbox
                    id={perm}
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  <label
                    htmlFor={perm}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send Invite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
