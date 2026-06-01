## Connexion de FlexyProf à GitHub + déploiement GitHub Pages

### Étape 1 — Connecter Lovable à ton repo GitHub existant

Cette partie ne nécessite aucun code, elle se fait dans l'interface Lovable :

1. En haut à droite de l'éditeur Lovable, clique sur **GitHub** → **Connect to GitHub**.
2. Autorise l'application **Lovable** sur ton compte GitHub.
3. Choisis l'organisation/compte qui contient ton repo existant.
4. Sélectionne le repo à connecter (FlexyProf).
5. Lovable va alors pousser automatiquement tout le code actuel sur la branche `main`, et synchronisera dans les deux sens à chaque modification.

Une fois connecté :
- Chaque modification faite dans Lovable apparaît comme un commit dans GitHub.
- Chaque push fait directement sur GitHub se synchronise dans Lovable.

### Étape 2 — Avertissement important sur GitHub Pages

Ton projet FlexyProf utilise **TanStack Start**, un framework full-stack. Cela veut dire que certaines fonctionnalités ne fonctionneront PAS sur GitHub Pages, qui n'héberge que des fichiers statiques :

```text
Ce qui marche sur GitHub Pages :
  - Pages HTML / CSS / JS du front
  - Images et assets
  - Navigation entre routes (avec config spéciale)

Ce qui NE marche PAS sur GitHub Pages :
  - Server functions (createServerFn) — IA, OCR, auth serveur
  - API routes (/api/*)
  - SSR (Server-Side Rendering)
  - Connexions sécurisées à Supabase / OpenAI
  - Vérifications email OTP côté serveur
```

Concrètement, pour FlexyProf cela signifie que **l'authentification, les appels à l'IA, la lecture OCR et la base de données ne fonctionneront pas** si tu déploies sur GitHub Pages tel quel. Tu n'auras qu'une vitrine statique.

### Étape 3 — Préparer l'export statique

Je vais configurer le projet pour générer une build statique compatible GitHub Pages :

1. **Ajouter un workflow GitHub Actions** (`.github/workflows/deploy.yml`) qui :
   - se déclenche à chaque push sur `main`
   - installe les dépendances avec `bun install`
   - lance la build statique
   - publie le résultat sur la branche `gh-pages` via l'action officielle `actions/deploy-pages`
   - utilise `permissions: { contents: read, pages: write, id-token: write }` (principe du moindre privilège)
   - épingle les actions tierces par SHA pour la sécurité

2. **Adapter la config Vite** pour :
   - définir `base: "/<nom-du-repo>/"` (nécessaire pour les URLs sur GitHub Pages)
   - désactiver le SSR / les server functions dans la build
   - basculer en mode SPA pure (rendu côté client uniquement)

3. **Désactiver / mettre en mode "demo" les fonctionnalités serveur** pour qu'elles n'apparaissent pas comme cassées :
   - `/dashboard` et `/auth` afficheront un message "Mode démo — backend désactivé"
   - Les boutons d'IA renverront un message explicatif

4. **Ajouter un fichier `.nojekyll`** dans `public/` (sinon GitHub Pages ignore les fichiers commençant par `_`).

5. **Documentation** : créer un `DEPLOY.md` expliquant comment activer GitHub Pages dans **Settings → Pages → Source: GitHub Actions**.

### Étape 4 — Activer GitHub Pages côté GitHub

Après le premier push, dans ton repo GitHub :

1. Va dans **Settings** → **Pages**.
2. Sous **Source**, sélectionne **GitHub Actions**.
3. Attends que le workflow se termine (onglet **Actions**).
4. Ton site sera disponible à `https://<ton-user>.github.io/<nom-du-repo>/`.

### Recommandation forte

Étant donné que **FlexyProf a besoin d'un backend** (IA, OCR, auth, base de données), GitHub Pages n'est pas le bon hébergeur pour la version finale. Mon conseil :

- **Court terme** : garder le déploiement **Lovable Publish** (déjà actif sur `flexy-study-buddy.lovable.app`), qui supporte tout le full-stack.
- **GitHub Pages** : l'utiliser uniquement comme **vitrine marketing / landing page statique** pointant vers l'app Lovable.
- **Long terme** : si tu veux quitter Lovable plus tard, migrer vers **Vercel** ou **Cloudflare Pages** qui supportent TanStack Start nativement.

### Détails techniques

- Framework : TanStack Start (Vite 7, React 19, TanStack Router)
- Runtime cible actuel : Cloudflare Workers (via Nitro)
- Pour l'export GitHub Pages : passage en mode SPA pure (`vite build` sans Nitro, output dans `dist/`)
- Le routeur TanStack supportera GitHub Pages via le mode `hash` ou la config `basepath`
- Aucun secret ne sera exposé dans les workflows (rien à configurer côté GitHub Secrets pour une build statique)

Veux-tu que je procède avec ce plan, ou préfères-tu d'abord uniquement connecter le repo GitHub (étape 1) sans déployer sur GitHub Pages ?