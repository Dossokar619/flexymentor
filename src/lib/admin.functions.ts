import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-side admin guard: throws if caller is not admin/super_admin.
async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: admin role required");
}

// Get the caller's active tenant id; throws if not set.
async function getCallerTenantId(userId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("active_tenant_id, tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const tid = data?.active_tenant_id ?? data?.tenant_id;
  if (!tid) throw new Error("No active tenant for current user");
  return tid;
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, subs, ai, reports, announcements] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name, avatar_url, streak_days, courses_count, quizzes_passed, created_at").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("subscriptions").select("*").order("updated_at", { ascending: false }).limit(100),
      supabaseAdmin.from("ai_usage_logs").select("*").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("moderation_reports").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("announcements").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { count: usersCount } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });

    const usage = ai.data ?? [];
    const totalTokens = usage.reduce((s, r: any) => s + (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0), 0);
    const totalCostCents = usage.reduce((s, r: any) => s + (r.cost_cents ?? 0), 0);

    return {
      stats: {
        users: usersCount ?? 0,
        admins: (roles ?? []).filter((r) => r.role === "admin").length,
        moderators: (roles ?? []).filter((r) => r.role === "moderator").length,
        openReports: (reports.data ?? []).filter((r: any) => r.status === "open").length,
        activeSubs: (subs.data ?? []).filter((s: any) => s.status === "active").length,
        aiCalls: usage.length,
        totalTokens,
        totalCostCents,
      },
      profiles: profiles.data ?? [],
      subscriptions: subs.data ?? [],
      aiUsage: usage,
      reports: reports.data ?? [],
      announcements: announcements.data ?? [],
      roles: roles ?? [],
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "moderator", "user"]),
      enabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("Cannot delete your own account here");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(5000),
      published: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const tenantId = await getCallerTenantId(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin.from("announcements")
        .update({ title: data.title, body: data.body, published: data.published })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("announcements").insert({
        title: data.title, body: data.body, published: data.published,
        created_by: context.userId, tenant_id: tenantId,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      plan: z.enum(["free", "pro", "team"]),
      status: z.enum(["active", "canceled", "past_due"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("subscriptions").upsert({
      user_id: data.userId, plan: data.plan, status: data.status,
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["open", "resolved", "dismissed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("moderation_reports").update({
      status: data.status,
      resolved_by: context.userId,
      resolved_at: data.status === "open" ? null : new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSystemSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      key: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
      value: z.any(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("system_settings").upsert({
      key: data.key, value: data.value, updated_by: context.userId, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });
