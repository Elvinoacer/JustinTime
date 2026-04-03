"use client";

import { useEffect, useState } from "react";
import { ShieldBan, Loader2, UserX, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { getBlockedUsers, unblockUser } from "@/app/actions/safety";

type BlockedRelation = {
  id: string;
  reason: string | null;
  blocked: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export default function BlockedUsersManager() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadBlockedUsers = async () => {
    setLoading(true);
    try {
      const results = await getBlockedUsers();
      setBlockedUsers(results as BlockedRelation[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load blocked users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const handleUnblock = async (targetId: string) => {
    setProcessingId(targetId);
    try {
      const result = await unblockUser(targetId);
      if (!result.success) {
        toast.error(result.error || "Failed to unblock user");
        return;
      }

      setBlockedUsers((previous) =>
        previous.filter((entry) => entry.blocked.id !== targetId),
      );
      toast.success("User unblocked");
    } catch (error) {
      console.error(error);
      toast.error("Failed to unblock user");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <ShieldBan className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-600 font-medium">No blocked users</p>
        <p className="text-sm text-gray-500 mt-1">
          Users you block in chat will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blockedUsers.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {entry.blocked.name || "Unknown user"}
              </p>
              {entry.reason ? (
                <p className="text-xs text-gray-500 truncate">
                  Reason: {entry.reason}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleUnblock(entry.blocked.id)}
            disabled={processingId === entry.blocked.id}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
          >
            {processingId === entry.blocked.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Undo2 className="w-4 h-4" />
            )}
            Unblock
          </button>
        </div>
      ))}
    </div>
  );
}
