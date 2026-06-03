# Plan — FlexyMentor Multi-Tenant SaaS

Refonte en une seule passe, avec tenant `flexymentor` par défaut pour préserver l'existant. Toi (`dossoabdoul619@gmail.com`) deviens **Super Admin** global + Tenant Admin de ce tenant.

## 1. Schéma base de données (1 migration)

### Nouvelles tables
- `tenants` : `id, name, slug (unique), logo_url, description, status, primary_color, secondary_color, welcome_message, created_at, updated_at`
- `tenant_members` : `id, tenant_id, user_id, role (tenant_admin|teacher|student), created_at` — UNIQUE(tenant_id, user_id)
- `tenant_invitations` : `id, tenant_id, email, role, token, expires_at, accepted_at`

### Enum app_role étendu
Ajout de `super_admin`, `tenant_admin`, `teacher`, `student` (on garde `admin`/`moderator`/`user` pour compat — `admin` = legacy super_admin).

### Colonnes `tenant_id` ajoutées (NOT NULL, FK tenants)
- `profiles`, `announcements`, `subscriptions`, `moderation_reports`, `ai_usage_logs`, `system_settings`

Backfill : toutes les lignes existantes → tenant `flexymentor`.

### Helpers SECURITY DEFINER
- `current_tenant_id()` : tenant actif de l'utilisateur (1er tenant_member, ou stocké dans `profiles.active_tenant_id`)
- `is_super_admin(uid)` : vérifie role super_admin dans user_roles
- `is_tenant_member(uid, tid)` / `tenant_role(uid, tid)`
- `is_tenant_admin(uid, tid)`

### RLS — réécriture complète
Toutes les policies des 6 tables existantes deviennent :
- SELECT : `is_super_admin(auth.uid()) OR (tenant_id = current_tenant_id() AND is_tenant_member(auth.uid(), tenant_id))`
- INSERT/UPDATE/DELETE : restreint au tenant courant + rôle requis
- `tenants` : super_admin tout ; tenant_admin → son tenant ; membre → SELECT seul
- `tenant_members` : super_admin/tenant_admin manage ; user voit ses propres

### Trigger `handle_new_user` mis à jour
Crée profile + assigne au tenant via invitation (si token en metadata) sinon onboarding requis.

## 2. Couche applicative

### `src/lib/tenant.functions.ts` (createServerFn)
- `getMyTenants()` : liste des tenants où l'user est membre
- `getActiveTenant()` : tenant courant + branding
- `switchTenant(tenantId)` : change `active_tenant_id` sur le profil
- `createTenant({name, slug, logo})` : onboarding
- `inviteMember({email, role})` : génère invitation
- `acceptInvitation(token)`
- `updateTenantBranding(...)`
- `listTenantMembers()` / `updateMemberRole()` / `removeMember()`

### `src/lib/super-admin.functions.ts`
- `listAllTenants()`, `listAllUsers()`, `getGlobalAnalytics()`, `updateTenantStatus()`

### Contexte React : `TenantProvider`
- Charge `getActiveTenant()` au login
- Expose `{tenant, role, switchTenant, isSuperAdmin}`
- Injecte CSS vars `--primary`, `--secondary` dynamiquement dans `<html style>`

## 3. Routes

```
src/routes/
  index.tsx                          (landing)
  auth.tsx                           (existant)
  onboarding.tsx                     (créer une org si user sans tenant)
  invite.$token.tsx                  (accepter invitation)
  _authenticated/
    route.tsx                        (gate + charge TenantProvider)
    dashboard.tsx                    (étudiant/prof — scoped tenant)
    admin/
      route.tsx                      (gate tenant_admin)
      index.tsx                      (overview)
      members.tsx                    (CRUD users du tenant)
      branding.tsx                   (logo+couleurs+welcome)
      analytics.tsx                  (stats du tenant)
    super-admin/
      route.tsx                      (gate super_admin)
      index.tsx                      (overview global)
      tenants.tsx                    (CRUD all tenants)
      users.tsx                      (tous users)
      analytics.tsx                  (global)
```

## 4. Branding dynamique
- `TenantProvider` écrit `document.documentElement.style.setProperty('--primary', tenant.primary_color)` etc.
- Logo dans le header remplacé par `tenant.logo_url`
- Storage bucket `tenant-logos` (public) + policy : tenant_admin upload son logo

## 5. Données de démo
3 tenants seedés : **Alpha School** (bleu), **Beta University** (vert), **Gamma Training Center** (orange), chacun avec 1 admin + 2 profs + 5 étudiants + annonces.

## 6. Migration des accès existants
- Tenant `flexymentor` créé
- Tous les profils existants → membres `tenant_admin` (ou `student` selon role legacy)
- Toi : ajouté à `user_roles` comme `super_admin` + `tenant_admin` du tenant flexymentor
- `/admin` actuel devient `/super-admin` (legacy admin = super admin)

## 7. Tests d'isolation
Script SQL à la fin de la migration vérifiant qu'un user du tenant Alpha ne peut SELECT aucune ligne tagged Beta.

---

## Détails techniques

**RLS recursion** : tous les checks tenant utilisent `SECURITY DEFINER` helpers — pas de sous-requête directe sur `tenant_members` dans les policies de `tenant_members`.

**Performance** : index sur `(tenant_id)` pour chaque table + `(user_id, tenant_id)` sur `tenant_members`.

**Backward compat** : les anciennes routes `/admin` redirigent vers `/super-admin` ou `/admin` (tenant) selon rôle. Le composant Admin existant est conservé pour le super-admin.

**Sécurité** : aucune serverFn ne fait confiance au `tenantId` envoyé par le client → toujours dérivé via `current_tenant_id()` côté DB ou via `requireSupabaseAuth` + check membership côté serveur.

**Auth OAuth** : Google déjà géré ; ajout Apple via `supabase--configure_social_auth` à la fin.

---

## Livrables, dans cet ordre
1. Migration SQL (tables + RLS + helpers + backfill + super_admin pour toi)
2. ServerFns tenant + super-admin
3. TenantProvider + injection branding
4. Routes admin tenant + super-admin
5. Onboarding + invitations
6. Storage bucket logos + upload UI
7. Seed des 3 tenants démo
8. Configure Apple OAuth

Estimation : ~15–20 fichiers créés/modifiés, 1 grosse migration. Risque principal : RLS sur tables existantes — testé immédiatement après la migration.

Valide ce plan et je commence par la migration.
