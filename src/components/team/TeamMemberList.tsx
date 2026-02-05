"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Trash2, Shield, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { removeMember } from "@/app/actions/teams";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { InviteMemberModal } from "./InviteMemberModal";

interface TeamMember {
  id: string; // TeamMember ID
  role: string;
  permissions: string[];
  user: {
    id: string; // User ID
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface TeamMemberListProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: string;
}

export function TeamMemberList({ members, currentUserId, currentUserRole }: TeamMemberListProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const router = useRouter();
  const isOwner = currentUserRole === "OWNER";

  const handleRemove = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member? They will lose all access immediately.")) return;
    
    try {
        const result = await removeMember(memberId);
        if (result.success) {
            toast.success("Member removed.");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to remove.");
        }
    } catch (e) {
        toast.error("Error removing member");
    }
  };

  return (
    <>
      {/* Action Bar */}
      {isOwner && (
        <div className="p-4 border-b border-gray-100 bg-white flex justify-end">
            <Button onClick={() => setInviteOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <UserPlus className="h-4 w-4" />
                Invite Member
            </Button>
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-gray-100">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-gray-200">
                <AvatarImage src={member.user.image || ""} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                    {member.user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{member.user.name || "Unknown User"}</p>
                    {member.user.id === currentUserId && (
                        <Badge variant="outline" className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700">You</Badge>
                    )}
                </div>
                <p className="text-sm text-gray-500">{member.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end gap-1">
                   <Badge variant={member.role === "OWNER" ? "default" : "secondary"} className={member.role === "OWNER" ? "bg-gray-900" : ""}>
                      {member.role}
                   </Badge>
                   {member.role !== "OWNER" && (
                       <span className="text-xs text-gray-400">{member.permissions.length} permissions</span>
                   )}
               </div>

               {isOwner && member.role !== "OWNER" && (
                   <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                               <MoreVertical className="h-4 w-4" />
                           </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                           <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => handleRemove(member.id)}>
                               <Trash2 className="mr-2 h-4 w-4" />
                               Remove Access
                           </DropdownMenuItem>
                       </DropdownMenuContent>
                   </DropdownMenu>
               )}
            </div>
          </div>
        ))}
        
        {members.length === 0 && (
            <div className="p-8 text-center text-gray-500">
                No members yet. Invite someone to get started!
            </div>
        )}
      </div>

      <InviteMemberModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
