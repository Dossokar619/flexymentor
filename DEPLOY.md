# Déploiement de FlexyMentor

## Vue d'ensemble

FlexyMentor peut être déployé de plusieurs façons. Voici les options et leurs limitations.

| Plateforme | Frontend | Backend (IA, OCR, Auth) | Recommandé pour |
|------------|----------|-------------------------|-----------------|
| **Lovable Publish** | ✅ | ✅ | Production (déjà actif) |
| **Vercel** | ✅ | ✅ | Production self-hosted |
| **Cloudflare Pages** | ✅ | ✅ | Production self-hosted |
| **GitHub Pages** | ✅ | ❌ | Vitrine statique uniquement |

## Option 1 — Lovable Publish (recommandé)

Le projet est déjà publié sur :
- **Production** : https://flexy-study-buddy.lovable.app
- **Preview** : URL générée à chaque modification dans Lovable

Aucune action requise — chaque clic sur **Publish** dans Lovable met à jour le site.

## Option 2 — GitHub Pages (vitrine statique)

⚠️ **Important** : GitHub Pages n'héberge que des fichiers statiques. Les fonctionnalités suivantes **ne fonctionneront pas** :
- Authentification (login, OTP email)
- Appels à l'IA (OpenAI)
- OCR (Google Vision)
- Base de données (Supabase)
- Toute logique serveur (`createServerFn`, `/api/*`)

GitHub Pages convient uniquement si tu veux une **landing page de présentation** pointant vers la vraie app hébergée ailleurs.

### Activation

1. **Connecter le repo à GitHub** depuis Lovable (bouton GitHub en haut à droite).
2. Une fois le code poussé, va dans ton repo GitHub :
   - **Settings** → **Pages**
   - Sous **Source**, sélectionne **GitHub Actions**
3. Pousse un commit sur `main` (ou déclenche manuellement le workflow depuis l'onglet **Actions**).
4. Le workflow `.github/workflows/deploy-pages.yml` va :
   - Installer les dépendances (`bun install`)
   - Lancer la build (`bun run build`)
   - Publier le résultat sur GitHub Pages
5. Le site sera disponible à `https://<ton-user>.github.io/<nom-du-repo>/`.

### Limitations techniques

Le projet utilise **TanStack Start** avec Nitro (Cloudflare Workers). La build par défaut produit un output serveur, pas un site purement statique. Pour un vrai export statique propre, il faudrait :

1. Reconfigurer Vite en mode SPA (désactiver Nitro et le SSR)
2. Définir `base: "/<nom-du-repo>/"` dans la config Vite
3. Convertir les routes utilisant des `createServerFn` en mode "mock" ou les retirer
4. Adapter le routeur TanStack pour fonctionner sans serveur

Si tu veux faire cette migration, demande à Lovable de la préparer dans un message dédié.

## Option 3 — Migrer vers Vercel ou Cloudflare Pages

Ces deux plateformes supportent **nativement TanStack Start** avec toutes les fonctionnalités full-stack. C'est le bon choix si tu veux quitter Lovable tout en gardant un vrai backend.

- **Vercel** : import direct depuis GitHub, domaine personnalisé gratuit, serverless functions natives.
- **Cloudflare Pages** : même runtime que la build actuelle (Workers), très rapide, généreux côté gratuit.

## Sécurité du workflow GitHub Actions

Le workflow fourni applique les bonnes pratiques :
- **Permissions minimales** : `permissions: {}` au niveau workflow, élargies par job uniquement.
- **Actions tierces épinglées par SHA** (pas par tag mutable type `@v4`).
- **Aucun secret exposé** dans le YAML (build statique n'en a pas besoin).
- **Concurrence contrôlée** : une seule exécution Pages à la fois.

Si tu ajoutes des secrets plus tard (ex: clé API pour build-time), utilise **Settings → Secrets and variables → Actions** dans GitHub — jamais en clair dans le YAML.
