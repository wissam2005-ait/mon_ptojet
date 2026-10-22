# ElectroPro

Site vitrine + espace professionnel (dirigeant, employés, stagiaires) pour une entreprise d'électricité.
Backend Spring Boot 3 / PostgreSQL, frontend React + Vite + Tailwind.

## Lancer en local (3 terminaux)
Prérequis : Docker, Java 17+, Maven, Node.js 18+.

1. **Base de données** (dossier `electropro`) : `docker compose up -d`
2. **Backend** (dossier `backend`) : `mvn spring-boot:run` → http://localhost:8080
3. **Frontend** (dossier `frontend`) : `npm install` puis `npm run dev` → http://localhost:5173

Connexion à l'espace pro : http://localhost:5173/admin/login
Compte dirigeant de développement (créé au premier démarrage) : `admin@electropro.local` / `ChangeMe-Dev-2026!`
→ Changez-le (ou définissez `ADMIN_EMAIL` / `ADMIN_PASSWORD` avant le premier démarrage).

## Première prise en main
1. Menu **Employés** : créez un employé (rôle Employé ou Stagiaire) avec un mot de passe provisoire.
2. Menu **Clients** puis **Chantiers** : créez un client et un chantier, puis « Gérer l'équipe » pour y affecter l'employé.
3. Connecté en employé : **Matériel** (liste du matériel du chantier) et **Réalisations** (« Ajouter une réalisation » avec photos → visible sur la page d'accueil du site).
4. En dirigeant : **Matériel** → « Marquer acheté » (prix HT) ; **Factures** → « Générer une facture » ; **Salaires** → montant mensuel et paiements.

## À personnaliser
- `frontend/src/lib/company.ts` : nom, adresse, SIRET, TVA, IBAN et mentions imprimés sur les factures (à faire relire par votre comptable).
- Textes du site : `frontend/src/pages/Home.tsx`, `Services.tsx`.

## Production
Variables d'environnement du backend (profil `prod`, `SPRING_PROFILES_ACTIVE=prod`) :
`DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (32 caractères minimum), `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`CORS_ORIGIN` (adresse du site), `UPLOAD_DIR` (dossier des photos : volume persistant, à sauvegarder).
Frontend : `VITE_API_URL` (ex. `https://api.mondomaine.fr/api`) puis `npm run build` ; publier le dossier `dist`.
