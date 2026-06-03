import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentTenant } from "@/lib/tenant.functions";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  welcome_message: string | null;
  status: string;
};

type TenantContextValue = {
  tenant: Tenant | null;
  role: string | null;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isLoading: boolean;
  refetch: () => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const fn = useServerFn(getCurrentTenant);
  const q = useQuery({
    queryKey: ["tenant", "current"],
    queryFn: () => fn(),
    staleTime: 60_000,
    retry: false,
  });

  const tenant = (q.data?.tenant as Tenant | null) ?? null;

  // Inject branding as CSS custom properties on :root
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (tenant?.primary_color) root.style.setProperty("--primary", tenant.primary_color);
    if (tenant?.secondary_color) root.style.setProperty("--secondary", tenant.secondary_color);
    if (tenant?.primary_color) root.style.setProperty("--ring", tenant.primary_color);
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--ring");
    };
  }, [tenant?.primary_color, tenant?.secondary_color]);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      role: q.data?.role ?? null,
      isSuperAdmin: !!q.data?.isSuperAdmin,
      isTenantAdmin: q.data?.role === "tenant_admin" || !!q.data?.isSuperAdmin,
      isLoading: q.isLoading,
      refetch: () => q.refetch(),
    }),
    [tenant, q.data?.role, q.data?.isSuperAdmin, q.isLoading, q.refetch],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within <TenantProvider>");
  return ctx;
}
