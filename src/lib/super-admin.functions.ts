import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const HEX_OR_OKLCH = /^(#[0-9a-fA-F]{3,8}|oklch\([^)]+\)|rgb\([^)]+\)|hsl\([^)]+\))$/;

async function assertSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "admin"])
    .limit(1);
  if (!data || data.length === 0) throw new Error("Forbidden: super_admin role required");
}

export const checkIsSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["super_admin", "admin"])
      .limit(1);
    return { isSuperAdmin: !!(data && data.length) };
  });

export const getSuperAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [tenants, members, profiles, ai] = await Promise.all([
      supabaseAdmin.from("tenants").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("tenant_members").select("tenant_id, user_id, role"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("ai_usage_logs").select("tenant_id, cost_cents, prompt_tokens, completion_tokens"),
    ]);

    const byTenant = new Map<string, { users: number; ai: number; tokens: number; cost: number }>();
    for (const m of members.data ?? []) {
      const s = byTenant.get(m.tenant_id) ?? { users: 0, ai: 0, tokens: 0, cost: 0 };
      s.users++;
      byTenant.set(m.tenant_id, s);
    }
    for (const a of ai.data ?? []) {
      const s = byTenant.get(a.tenant_id) ?? { users: 0, ai: 0, tokens: 0, cost: 0 };
      s.ai++;
      s.tokens += (a.prompt_tokens ?? 0) + (a.completion_tokens ?? 0);
      s.cost += a.cost_cents ?? 0;
      byTenant.set(a.tenant_id, s);
    }

    return {
      tenants: (tenants.data ?? []).map((t) => ({
        ...t,
        stats: byTenant.get(t.id) ?? { users: 0, ai: 0, tokens: 0, cost: 0 },
      })),
      stats: {
        tenants: (tenants.data ?? []).length,
        users: profiles.count ?? 0,
        memberships: (members.data ?? []).length,
        aiCalls: (ai.data ?? []).length,
      },
    };
  });

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        slug: z.string().trim().min(2).max(50).regex(SLUG_RE),
        description: z.string().trim().max(500).optional(),
        primary_color: z.string().regex(HEX_OR_OKLCH).optional(),
        secondary_color: z.string().regex(HEX_OR_OKLCH).optional(),
        logo_url: z.string().url().max(2000).optional(),
        welcome_message: z.string().trim().max(500).optional(),
        admin_user_id: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { admin_user_id, ...row } = data;
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    if (admin_user_id) {
      await supabaseAdmin
        .from("tenant_members")
        .upsert({ tenant_id: tenant.id, user_id: admin_user_id, role: "tenant_admin" });
    }
    return { tenant };
  });

export const updateTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tenantId: z.string().uuid(),
        status: z.enum(["active", "suspended", "archived"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ status: data.status })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Tables with tenant_id will cascade via app logic; here we delete the tenant row and let FKs/data orphan.
    const { error } = await supabaseAdmin.from("tenants").delete().eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, tenant_id, active_tenant_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { users: data ?? [] };
  });
