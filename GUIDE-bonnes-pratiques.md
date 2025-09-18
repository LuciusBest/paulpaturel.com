# Guide pratique — paulpaturel.com

Ton site repose sur une organisation simple : tu travailles dans `src/`, tu génères une copie prête à publier dans `public/`, puis tu mets **tout** le dossier `public/` en ligne. Voici les points clés pour t’y retrouver sans stress.

## 1. Comprendre les dossiers importants
- `src/` : version de travail. Tout ce que tu modifies (HTML, CSS, JS, images, polices) doit vivre ici.
  - `src/css/`, `src/js/`, `src/images/`, `src/font/` : ressources du site.
  - `src/data/projectTexts.json` : textes + tags pour l’overlay de droite (FR/EN).
  - `src/.htaccess`, `src/robots.txt`, `src/sitemap.xml` : fichiers de config copiés tels quels dans `public/`.
- `public/` : version générée. **Ne modifie rien ici à la main** ; ce dossier est supprimé/recréé par le build.
- `package.json` : liste des commandes rapides (`npm run build`, `npm run serve:public`, etc.).
- `redirects.csv` et `public/.htaccess` : redirections et réglages serveur. Si tu changes l’un, pense à ajuster l’autre.
- `REPORT-*.md`, `VERIFY.md`, `tests/` : check-lists et notes qualité (assets lourds, CSS inutilisé, cas de test).

## 1bis. Comprendre les fichiers de configuration clés
**redirects.csv**
- *En bref* : une table pour suivre tes redirections (ancienne URL → nouvelle URL).
- *Pourquoi c’est utile* : garde une vision claire de tout ce qui redirige, pratique pour Google et pour toi (ex : anciennes pages, marquages QR, etc.).
- *Comment ça marche* : chaque ligne contient `from,to`. Tu reports ces mêmes redirections dans `.htaccess` (section `Redirect 301`).
- *À surveiller* : garde les chemins relatifs (`/ancien/chemin`) et vérifie que la destination existe.

**.htaccess**
- *En bref* : mini-configuration pour Apache dans ton dossier. Chaque dossier peut avoir son propre `.htaccess`.
- *Pourquoi c’est utile* : même sans accès root, tu contrôles les redirections, la sécurité, les types de fichiers, le cache.
- *Ce qu’il fait chez toi* :
  - Force `https://paulpaturel.com/` (pas de `http` ni de `www`).
  - Ajoute des en-têtes de sécurité (`Strict-Transport-Security`, `X-Content-Type-Options`, etc.).
  - Définit les bons types MIME (`.js`, `.json`, polices…) : indispensable pour que les scripts chargent.
  - Pose des règles de cache “30 jours” pour les assets, “7 jours” pour les vidéos.
  - Contient les `Redirect 301` listés dans `redirects.csv`.
- *Bon à savoir* : une mauvaise règle peut bloquer le site. Teste les changements un par un et garde une copie de la version précédente.

**package.json**
- *En bref* : fiche d’identité du projet + scripts automatisés.
- *Pourquoi c’est utile* : un seul fichier sait quelles commandes lancer (`npm run build`, `npm run serve:public`, etc.).
- *Ce qu’il contient* :
  - `scripts`: raccourcis (build, serve:src, tests).
  - `devDependencies`: outils nécessaires (http-server, linkinator).
- *À faire* : si tu ajoutes un nouvel outil (ex : `chokidar-cli`), tu le déclares ici pour tout centraliser.

**sitemap.xml**
- *En bref* : plan du site pour les moteurs de recherche.
- *Pourquoi c’est utile* : Google, Bing, etc. découvrent toutes les pages importantes sans en oublier.
- *Ce qu’il contient* : une liste d’URL (`<loc>https://paulpaturel.com/...`) avec la date de mise à jour.
- *Maintenance* : à mettre à jour quand tu ajoutes/retire une page. Tu peux éditer le XML à la main ou utiliser un générateur en ligne.

**robots.txt**
- *En bref* : fichier qui indique aux robots ce qu’ils peuvent explorer.
- *Pourquoi c’est utile* : éviter que Google indexe des dossiers sensibles ou des brouillons.
- *Ce qu’il fait chez toi* : il autorise l’exploration et référence `sitemap.xml`. Si tu veux bloquer un dossier, tu ajoutes une ligne `Disallow: /chemin/`.
- *Attention* : robots.txt est public. N’y place pas d’informations sensibles, uniquement des chemins.

## 2. Routine de mise à jour
1. **Modifier** les fichiers dans `src/` (texte, styles, images, JSON…).
2. Ouvrir un terminal dans le dossier du projet et lancer `npm run build`.
   - Le script efface `public/` puis copie `src/` → `public/`.
3. (Optionnel) Vérifier en local :
   - `npm run serve:public` puis visite `http://localhost:4000`.
4. **Publier** : téléverser le dossier `public/` complet (y compris sous-dossiers et fichiers cachés comme `.htaccess`).
5. Sur le site : recharger avec `⌘⇧R` (ou `Ctrl+F5`) pour vider le cache et vérifier la console (`⌥⌘I`).

## 3. Tâches récurrentes
- **Ajouter un projet** : importer les visuels dans `src/images/...`, mettre à jour le HTML correspondant, ajouter la description + tags dans `src/data/projectTexts.json` (EN/FR si besoin).
- **Mettre à jour les tags** : les `<tag>...</tag>` dans `projectTexts.json` pilotent les puces interactives. Ajoute le mot dans les deux langues pour que le filtre fonctionne.
- **Gestion des langues** : la langue active est mémorisée dans le navigateur. Si un message “localStorage” apparaît, c’est normal en navigation privée ; le script retombe en anglais.
- **Redirections / SEO** : utilise `redirects.csv` pour suivre les redirs. Toute nouvelle redirection doit aussi être ajoutée dans `public/.htaccess` (section `Redirect 301`).
- **Performances** : consulte `REPORT-large-assets.md` pour détecter les médias lourds et `REPORT-unused-css.md` pour le ménage dans les styles.
- **Sauvegardes** : garde une copie locale de `src/` et de ton dernier dossier `public/` uploadé (utile en cas de souci FTP).

## 4. Astuces utiles
- **Raccourci VS Code** : configure une tâche (Tasks → Configure Task → npm: build) ou un raccourci clavier qui lance `workbench.action.tasks.runTask` avec « Build public » pour éviter le terminal.
- **Watch auto** : après avoir installé `chokidar-cli`, tu peux ajouter dans `package.json` un script `"watch": "chokidar 'src/**/*' -c 'npm run build'"` et l’exécuter avec `npm run watch` quand tu veux surveiller tes fichiers.
- **Contrôles rapides** : `npm run serve:src` pour un aperçu instantané ; `npm run check:links:public` pour repérer les liens cassés après un build.
- **FTP** : lors de l’upload, écrase toujours l’ancien contenu et vérifie que `.htaccess`, `data/`, `js/`, `font/` sont présents côté serveur.
- **Images** : privilégie `.webp`, garde les vidéos légères (< 20 Mo) et conserve `width`/`height` dans le HTML pour éviter les sauts de mise en page.
- **Caches** : si un changement ne se voit pas, vide le cache du navigateur (`⌘⇧R` ou `Ctrl+F5`), puis le cache de ton hébergeur si nécessaire.

## 5. Dépannage express
- Rien ne s’affiche (nom/bio/tags) ? Vérifie la console : si un script est en 404 ou bloqué, ré-uploade le dossier `public/js/` complet et le fichier `.htaccess`.
- Page cassée après build ? Tu as peut-être modifié `public/` à la main. Recommence depuis `src/` puis `npm run build`.
- Redirection en boucle ? Teste l’URL avec `curl -I https://paulpaturel.com/...` ou commente temporairement la règle `.htaccess` ajoutée.
- Fichier absent en ligne ? Vérifie via le navigateur (`https://paulpaturel.com/...`) et assure-toi que le fichier existe dans `src/` avant le build.

## 6. Checklist avant chaque mise en ligne
- [ ] Modifications faites dans `src/` uniquement.
- [ ] `npm run build` exécuté sans erreur.
- [ ] Aperçu local OK (`npm run serve:public`).
- [ ] Upload complet du dossier `public/` (incluant `.htaccess`, `data/`, `js/`, `font/`).
- [ ] Test rapide du site en navigation privée, console propre.
- [ ] Sauvegarde locale du dossier `public/` utilisé pour l’upload.

Garde ce guide à portée et complète-le dès que ton workflow évolue. Avec ces repères, chaque mise en ligne devrait rester simple et sereine.
