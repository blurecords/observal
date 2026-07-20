"use client";

import { type UserRole, canManage, canManageTeam, isOwner } from "@/lib/roles";
import { createContext, useContext } from "react";

interface RoleContextValue {
  role: UserRole;
  canWrite: boolean;
  isOwner: boolean;
  canManageTeam: boolean;
}

const RoleContext = createContext<RoleContextValue>({
  role: "owner",
  canWrite: true,
  isOwner: true,
  canManageTeam: true,
});

export function RoleProvider({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  return (
    <RoleContext.Provider
      value={{
        role,
        canWrite: canManage(role),
        isOwner: isOwner(role),
        canManageTeam: canManageTeam(role),
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export function WriteGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { canWrite } = useRole();
  return canWrite ? children : fallback;
}

export function OwnerGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isOwner } = useRole();
  return isOwner ? children : fallback;
}
