"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

interface RoleSelectionBoxProps {
  id: string;
  token: string;
  currentRole?: string;
  onRoleUpdated?: () => void;
}

export default function RoleSelectionBox({ 
  id, 
  token, 
  currentRole = "",
  onRoleUpdated 
}: RoleSelectionBoxProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const { toast } = useToast();
  const session = useSession();

  const handleRoleUpdate = async () => {
    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/update-provider-role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id,
            role: selectedRole,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Role updated to ${selectedRole}`,
        });
        onRoleUpdated?.();
      } else {
        throw new Error(data.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-3">Set Provider Role</h3>
      
      <div className="space-y-3">
        <div className="flex gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="role"
              value="provider"
              checked={selectedRole === "provider"}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Provider</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="role"
              value="broker"
              checked={selectedRole === "broker"}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Broker</span>
          </label>
        </div>

        <Button
          onClick={handleRoleUpdate}
          disabled={isLoading || !selectedRole || selectedRole === currentRole}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Updating..." : "Update Role"}
        </Button>
        
        {currentRole && (
          <p className="text-xs text-gray-500 text-center">
            Current role: <span className="font-medium capitalize">{currentRole}</span>
          </p>
        )}
      </div>
    </div>
  );
}