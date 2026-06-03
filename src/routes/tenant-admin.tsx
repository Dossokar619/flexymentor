import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ShieldAlert, ArrowLeft, Save, Mail, Trash2, Copy, UserPlus, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  updateTenantBranding, listTenantMembers, inviteMember, revokeInvitation, removeMember, updateMemberRole,
} from "@/lib/tenant.functions";

export const Route = createFileRoute("/tenant-admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Administration · Organisation" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: TenantAdminPage,
});

function TenantAdminPage() {
  const { tenant, isTenantAdmin, isLoading, refetch } = useTenant();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!tenant || !isTenantAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-sm text-muted-foreground mb-6">Réservé aux administrateurs d'organisation.</p>
          <Link to="/dashboard"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="container max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: tenant.primary_color }}>
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}
            <h1 className="font-display text-xl font-bold">{tenant.name}</h1>
            <Badge variant="secondary">Tenant Admin</Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-6 py-8">
        <Tabs defaultValue="branding">
          <TabsList>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="members">Membres & invitations</TabsTrigger>
          </TabsList>
          <TabsContent value="branding" className="mt-6">
            <BrandingTab tenant={tenant} onSaved={refetch} />
          </TabsContent>
          <TabsContent value="members" className="mt-6">
            <MembersTab tenantId={tenant.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function BrandingTab({ tenant, onSaved }: { tenant: any; onSaved: () => void }) {
  const fn = useServerFn(updateTenantBranding);
  const [form, setForm] = useState({
    name: tenant.name,
    description: tenant.description ?? "",
    primary_color: tenant.primary_color,
    secondary_color: tenant.secondary_color,
    logo_url: tenant.logo_url ?? "",
    welcome_message: tenant.welcome_message ?? "",
  });
  const mut = useMutation({
    mutationFn: () => fn({
      data: {
        tenantId: tenant.id,
        name: form.name,
        description: form.description || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        logo_url: form.logo_url || null,
        welcome_message: form.welcome_message || null,
      },
    }),
    onSuccess: () => { toast.success("Branding mis à jour"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-6 space-y-4 max-w-2xl">
      <div className="space-y-1.5"><Label>Nom de l'organisation</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>URL du logo</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Couleur primaire</Label>
          <div className="flex gap-2 items-center">
            <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            <div className="h-9 w-9 rounded-md border" style={{ background: form.primary_color }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Couleur secondaire</Label>
          <div className="flex gap-2 items-center">
            <Input value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
            <div className="h-9 w-9 rounded-md border" style={{ background: form.secondary_color }} />
          </div>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Message d'accueil</Label><Textarea rows={2} value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} /></div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Enregistrer
      </Button>
      <p className="text-xs text-muted-foreground">
        Astuce : utilise un format <code>oklch(L C H)</code> ou un code <code>#hex</code> pour les couleurs.
      </p>
    </Card>
  );
}

function MembersTab({ tenantId }: { tenantId: string }) {
  const listFn = useServerFn(listTenantMembers);
  const inviteFn = useServerFn(inviteMember);
  const revokeFn = useServerFn(revokeInvitation);
  const removeFn = useServerFn(removeMember);
  const roleFn = useServerFn(updateMemberRole);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["tenant-admin", "members", tenantId],
    queryFn: () => listFn({ data: { tenantId } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["tenant-admin", "members", tenantId] });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"tenant_admin" | "teacher" | "student" | "moderator">("student");

  const mutInvite = useMutation({
    mutationFn: () => inviteFn({ data: { tenantId, email, role } }),
    onSuccess: (r: any) => {
      const url = `${window.location.origin}/auth?invite=${r.token}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.success("Invitation créée — lien copié");
      setEmail("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const mutRevoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { tenantId, invitationId: id } }),
    onSuccess: () => { toast.success("Invitation révoquée"); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mutRemove = useMutation({
    mutationFn: (memberId: string) => removeFn({ data: { tenantId, memberId } }),
    onSuccess: () => { toast.success("Membre retiré"); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mutRole = useMutation({
    mutationFn: (v: { memberId: string; role: any }) => roleFn({ data: { tenantId, ...v } }),
    onSuccess: () => { toast.success("Rôle mis à jour"); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (q.isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />;
  const members = q.data?.members ?? [];
  const invitations = q.data?.invitations ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">Inviter un membre</h3>
        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder="email@exemple.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
          <select className="border rounded px-3 py-2 text-sm bg-background" value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="student">Étudiant</option>
            <option value="teacher">Enseignant</option>
            <option value="moderator">Modérateur</option>
            <option value="tenant_admin">Administrateur</option>
          </select>
          <Button onClick={() => mutInvite.mutate()} disabled={!email.includes("@") || mutInvite.isPending}>
            <UserPlus className="h-4 w-4 mr-2" />Inviter
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Un lien d'invitation sera copié dans ton presse-papier.</p>
      </Card>

      <Card>
        <div className="p-4 border-b font-semibold">Membres ({members.length})</div>
        <Table>
          <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Rôle</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {members.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{m.profiles?.display_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{m.user_id.slice(0, 8)}…</div>
                </TableCell>
                <TableCell>
                  <select className="border rounded px-2 py-1 text-sm bg-background" value={m.role}
                    onChange={(e) => mutRole.mutate({ memberId: m.id, role: e.target.value })}>
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="moderator">moderator</option>
                    <option value="tenant_admin">tenant_admin</option>
                  </select>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Retirer ce membre ?")) mutRemove.mutate(m.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Aucun membre</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <div className="p-4 border-b font-semibold">Invitations en attente ({invitations.filter((i: any) => !i.accepted_at).length})</div>
        <Table>
          <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {invitations.map((i: any) => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/auth?invite=${i.token}`;
              const expired = new Date(i.expires_at) < new Date();
              return (
                <TableRow key={i.id}>
                  <TableCell className="text-sm"><Mail className="inline h-3.5 w-3.5 mr-1" />{i.email}</TableCell>
                  <TableCell><Badge variant="outline">{i.role}</Badge></TableCell>
                  <TableCell>
                    {i.accepted_at
                      ? <Badge>acceptée</Badge>
                      : expired
                        ? <Badge variant="destructive">expirée</Badge>
                        : <Badge variant="secondary">en attente</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {!i.accepted_at && (
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(url); toast.success("Lien copié"); }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => mutRevoke.mutate(i.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {invitations.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucune invitation</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
