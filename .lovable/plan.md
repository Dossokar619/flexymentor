## Audit des endpoints API — Flexymentor

### Inventaire constaté

Le projet n'expose **qu'un seul endpoint serveur** :

| Endpoint | Type | Méthode | Auth | Validation | Données retournées |
|---|---|---|---|---|---|
| `getGreeting` (`src/lib/api/example.functions.ts`) | `createServerFn` | POST | ❌ Aucune | ✅ Zod `{ name: string min 1 }` | `{ greeting, mode }` |

**Aucun autre endpoint** :
- Pas de routes sous `src/routes/api/`
- Pas de webhook public (`/api/public/*`)
- Pas de server route avec `server.handlers`
- Pas d'Edge Function Supabase active
- Accès données Supabase = direct depuis le client via RLS (pas un "endpoint API" applicatif)

### Analyse de risque par critère

1. **Authentification manquante**
   - `getGreeting` : pas de `requireSupabaseAuth`. Accessible anonymement. **Risque faible** : la fonction est un exemple de démo, ne lit/écrit aucune donnée, ne consomme aucun secret externe. À supprimer si non utilisée, sinon ajouter le middleware le jour où elle traitera des données réelles.

2. **Autorisation manquante**
   - Pas de modèle de rôles, donc rien à autoriser. N/A.

3. **Exposition excessive de données**
   - `getGreeting` retourne `config.nodeEnv` (`"development"` / `"production"`). **Risque très faible** (information publique, déjà déductible). À retirer par hygiène.

4. **Méthodes insécurisées**
   - POST uniquement, pas de verbe dangereux exposé. Aucun handler raw HTTP, donc pas de risque CORS / preflight mal configuré. ✅

5. **Rate limiting manquant**
   - Aucun rate limit. Conformément à la politique Lovable Cloud actuelle, le backend ne fournit pas de primitives de rate limiting — c'est une **lacune connue, non bloquante**. À traiter au niveau infra/CDN si abus constaté.

6. **Risques transverses**
   - ⚠ `attachSupabaseAuth` non enregistré dans `src/start.ts` → tout futur endpoint protégé par `requireSupabaseAuth` répondra 401. À corriger **avant** d'ajouter le premier endpoint authentifié (déjà signalé dans l'audit Supabase).
   - ✅ Pas de `supabaseAdmin` utilisé côté serveur → pas de bypass RLS accidentel.
   - ✅ Pas de SSRF / injection : pas de `fetch(userInput)`, pas de SQL brut.

### Verdict global

**Surface d'attaque API quasi nulle.** Le seul endpoint est un exemple inoffensif. Les vrais accès données passent par Supabase + RLS (audité séparément). Les recommandations sont préventives, pas correctives.

### Recommandations (priorité)

1. **P2** — Supprimer `getGreeting` s'il n'est pas utilisé, ou retirer `mode: config.nodeEnv` du retour.
2. **P1** — Wirer `attachSupabaseAuth` dans `src/start.ts` (`functionMiddleware`) avant le premier `requireSupabaseAuth`.
3. **P3** — Documenter la convention : tout nouveau endpoint applicatif = `createServerFn` + `requireSupabaseAuth` + Zod ; tout webhook externe = `src/routes/api/public/*` + vérification HMAC + Zod.
4. **P3** — Pas de rate limiting au niveau code (limite plateforme connue). Le jour où un endpoint sensible est ajouté, prévoir un compteur applicatif côté Postgres (table `api_call_log` + check par minute).

### Livrable

Générer **`audit-api-flexymentor.pdf`** (3 pages, même style que les audits précédents via `reportlab`) :
- Page 1 : verdict + inventaire endpoints
- Page 2 : tableau d'analyse par critère (6 critères × statut + risque)
- Page 3 : recommandations priorisées + template d'endpoint sécurisé

QA visuel obligatoire (conversion pages → images, vérif pas de débordement / glyphes cassés) avant livraison dans `/mnt/documents/`.
