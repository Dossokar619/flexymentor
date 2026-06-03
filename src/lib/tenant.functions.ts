import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HEX_OR_OKLCH = /^(#[0-9a-fA-F]{3,8}|oklch\([^)]+\)|rgb\([^)]+\)|hsl\([^)]+\))$/;

/** Returns the active tenant for the current user (full row + role). */
export const getCurrentTenant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("active_tenant_id, tenant_id")
      .eq("id", context.userId)
      .maybeSingle();

    const tenantId = profile?.active_tenant_id ?? profile?.tenant_id ?? null;
    if (!tenantId) return { tenant: null, role: null, isSuperAdmin: await isSuper(context.userId) };

    const [{ data: tenant }, { data: member }] = await Promise.all([
      supabaseAdmin.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
      supabaseAdmin
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);

    return {
      tenant,
      role: member?.role ?? null,
      isSuperAdmin: await isSuper(context.userId),
    };
  });

/** List all tenants the current user belongs to (for the tenant switcher). */
export const getMyTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tenant_members")
      .select("role, tenant:tenants(id, name, slug, logo_url, primary_color, secondary_color, status)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({ ...r.tenant, role: r.role }));
  });

/** Switch the user's active tenant. They must be a member of it. */
export const switchTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin
      .from("tenant_members")
      .select("id")
      .eq("user_id", context.userId)
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    if (!m && !(await isSuper(context.userId))) throw new Error("Not a member of this tenant");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ active_tenant_id: data.tenantId })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Tenant admin: update branding (name, description, colors, logo URL, welcome message). */
export const updateTenantBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tenantId: z.string().uuid(),
        name: z.string().trim().min(2).max(120).optional(),
        description: z.string().trim().max(500).nullable().optional(),
        primary_color: z.string().regex(HEX_OR_OKLCH).optional(),
        secondary_color: z.string().regex(HEX_OR_OKLCH).optional(),
        logo_url: z.string().url().max(2000).nullable().optional(),
        welcome_message: z.string().trim().max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTenantAdmin(context.userId, data.tenantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tenantId, ...patch } = data;
    const { error } = await supabaseAdmin.from("tenants").update(patch).eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Tenant admin: list members (with profile info). */
export const listTenantMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertTenantAdmin(context.userId, data.tenantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: members, error } = await supabaseAdmin
      .from("tenant_members")
      .select("id, role, user_id, created_at, profiles:profiles!inner(id, display_name, avatar_url)")
      .eq("tenant_id", data.tenantId)
      .order("created_at");
    if (error) throw new Error(error.message);

    const { data: invitations } = await supabaseAdmin
      .from("tenant_invitations")
      .select("id, email, role, token, expires_at, accepted_at, created_at")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false });

    return { members: members ?? [], invitations: invitations ?? [] };
  });

/** Tenant admin: change a member's role. */
export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tenantId: z.string().uuid(),
        memberId: z.string().uuid(),
        role: z.enum(["tenant_admin", "teacher", "student", "moderator"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTenantAdmin(context.userId, data.tenantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenant_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Tenant admin: remove a member from this tenant. */
export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ tenantId: z.string().uuid(), memberId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTenantAdmin(context.userId, data.tenantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenant_members")
      .delete()
      .eq("id", data.memberId)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Tenant admin: invite an email; returns the invitation token (share link). */
export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tenantId: z.string().uuid(),
        email: z.string().email().max(255),
        role: z.enum(["tenant_admin", "teacher", "student", "moderator"]).default("student"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTenantAdmin(context.userId, data.tenantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("tenant_invitations")
      .insert({
        tenant_id: data.tenantId,
        email: data.email.toLowerCase(),
        role: data.role,
        invited_by: context.userId,
      })
      .select("token, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return { token: row.token, expires_at: row.expires_at };
  });

/** Tenant admin: revoke an invitation. */
export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ tenantId: z.string().uuid(), invitationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTenantAdmin(context.userId, data.tenantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenant_invitations")
      .delete()
      .eq("id", data.invitationId)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- helpers --------------------------------------------------------------
async function isSuper(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "admin"])
    .limit(1);
  return !!(data && data.length);
}

async function assertTenantAdmin(userId: string, tenantId: string) {
  if (await isSuper(userId)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tenant_members")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("role", "tenant_admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: tenant_admin role required");
}
