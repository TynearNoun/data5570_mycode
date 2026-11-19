# Daily Challenge

Daily Challenge is an app for a circle of friends. Each group gets one dare a day. Members send proof (words, a photo, or a video link), react to each other, talk in the group chat, and climb a board of points and streaks. The Expo project is `dailychallenge`.

The problem it takes on is a quiet group chat with nothing to do. The people it is for are friends who want a small shared plan that resets every day.

## What you can do

- Create an account and sign in. The session is a Django token kept in the app.
- Create a friend group or join one with an invite code. The seeded circle is **Weeknight Crew**, code **WEEKNIGHT**.
- Open today’s challenge. If the group does not have one yet, the API creates it from a fixed prompt bank, so the same group and date always get the same dare.
- Send proof. A photo is uploaded with the form. A video is a link. Words are required either way.
- React to someone else’s proof. Your own proof cannot be cheered by you.
- Write a custom challenge for the group.
- Read the group chat and send a message.
- Read the leaderboard. Proof is 10 points, a reaction on your proof is 2, and a custom challenge you write is 3. Streaks count consecutive daily challenges, on a Denver day.
- Change the name and bio on the account screen.

The screens follow the data. With no group, Today asks you to join one. After you send proof, the form is replaced by your card and the board updates.

## Demo accounts

Both passwords are `Rally-demo-19`.

| Name | Username | What you’ll see |
| --- | --- | --- |
| Mara Chen | mara | Has not sent today’s proof. Ellis has. |
| Ellis Okonkwo | ellis | Already on a streak, and leading the board. |

Sign in as Mara from the login screen, then send today’s proof. Ellis’s note and Mara’s fire reaction are already there.

## Run it locally

You need Node.js 22 and Python 3.12.

API, from `finalproject/djangobackend`:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py test
python manage.py runserver 0.0.0.0:8042
```

Health check: `http://127.0.0.1:8042/api/health/`

App, from `finalproject/dailychallenge`:

```bash
npm install
npm run web
```

That starts Django on `127.0.0.1:8042` and the web app on `http://127.0.0.1:8091`. The browser talks only to port 8091. Expo forwards `/api` and `/media` to Django, so do not point `EXPO_PUBLIC_DJANGO_API_URL` at `127.0.0.1:8042`.

`npm run ios` and `npm run android` do not use that forwarder. A phone cannot use `127.0.0.1`, so set `EXPO_PUBLIC_DJANGO_API_URL` to the computer’s address or the EC2 address and start Expo again. Expo reads `EXPO_PUBLIC_` values when the bundle is built.

Copy `djangobackend/.env.example` to `djangobackend/.env` before you put real secrets there. The app runs without that file; the defaults are for local development only.

## EC2

The class API host is the instance at **13.56.184.13**. The key pair is **data5570finalproject**. The private key file is `C:\Users\tynea\Downloads\data5570finalproject.pem`. That file is not in this repository, and it should not be committed.

From PowerShell, in `finalproject`:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\ec2.ps1
```

The script tightens the key’s file permissions so OpenSSH will accept it, copies the project to the instance, and starts the API with systemd on port **8000**. The service is `rally-api`. The login user is `ec2-user`.

From Git Bash or WSL, the same steps are `bash deploy/ec2.sh`. If the key is not at `/mnt/c/Users/tynea/Downloads/data5570finalproject.pem`, set `RALLY_KEY` to the real path.

After it starts, the health check is `http://13.56.184.13:8000/api/health/`. The security group has to allow inbound TCP 8000 (and 22, which it already does). Then set the Expo variable and restart the app:

```bash
EXPO_PUBLIC_DJANGO_API_URL=http://13.56.184.13:8000/api
```

`runserver` matches the class setup. It is the development server.

SQLite on the instance is the database until you set RDS. Optional proof photos can go to S3 when `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, and `AWS_S3_REGION` are in the server environment. Without them, photos stay in Django’s `media/` folder. `us-west-1` is the right region for this instance. Supabase or any other Postgres host works the same way as RDS: set `DB_ENGINE=django.db.backends.postgresql` and the host, name, user, password, and port in `.env`.

## API

Nouns, not verbs. Token header: `Authorization: Token <key>`.

| Method | Path | Status | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health/` | 200 | Liveness. No token. |
| POST | `/api/auth/register/` | 201 | Create an account. 400 if the name or email is taken. |
| POST | `/api/auth/login/` | 200 | Username or email, plus password. 401 if they do not match. |
| POST | `/api/auth/logout/` | 204 | Drop the token. |
| GET | `/api/users/me/` | 200 | Current account. 401 without a token. |
| PUT | `/api/users/me/` | 200 | Update display name and bio. |
| GET | `/api/groups/` | 200 | Groups the user belongs to. |
| POST | `/api/groups/` | 201 | Create a group. The creator is the owner. |
| POST | `/api/groups/join/` | 200 | Join with `{ "invite_code": "WEEKNIGHT" }`. 404 if the code is unknown. |
| GET | `/api/groups/{id}/` | 200 | One group. 403 if you are not a member. |
| GET | `/api/challenges/?group={id}` | 200 | Daily and custom challenges for a group. |
| POST | `/api/challenges/` | 201 | Create a custom challenge. |
| POST | `/api/challenges/daily/` | 200 or 201 | Return today’s dare, creating it the first time. |
| GET | `/api/challenges/{id}/` | 200 | One challenge. |
| GET | `/api/submissions/?challenge={id}` | 200 | Proof for a challenge. |
| POST | `/api/submissions/` | 201 | Send proof. 409 if you already did. 400 if a required photo or video is missing. |
| PUT | `/api/submissions/{id}/` | 200 | Edit your own proof. 403 for someone else’s. |
| POST | `/api/reactions/` | 201 | React. 200 if that reaction was already there. |
| DELETE | `/api/reactions/{id}/` | 200 | Remove your reaction. The updated proof comes back. |
| GET | `/api/messages/?group={id}` | 200 | Group chat, oldest first. |
| POST | `/api/messages/` | 201 | Send a message. |
| GET | `/api/leaderboard/?group={id}` | 200 | Points and streaks. |

A missing token on a protected route is 401. A route you can see but do not belong to is 403. An unknown id is 404.

## Course setup

The pieces the class asks for are already wired together.

- **Redux.** `dailychallenge/state/store.ts` holds one store for every screen. Thunks load data with GET and send it with POST. `fetchGroups` is `GET /api/groups/`. `login` and `createGroup` are POST. A listener refetches the board after proof or a reaction, so the pages share one copy of the data.
- **Django REST.** `djangobackend/dailychallenge/urls.py` is the API. Accounts, groups, challenges, proof, reactions, chat, and the board each have an endpoint.
- **Database.** SQLite is `djangobackend/db.sqlite3` on the EC2 instance. Set `DB_ENGINE` to Postgres when you move the same models to RDS.
- **Live hosts.** The API is `http://13.56.184.13:8000/api/health/`. The Expo site is published with EAS from `dailychallenge/`. The browser calls `/api` on that HTTPS site, and the site forwards the call to EC2. A phone calls EC2 directly. `npm run web` on your own computer still uses the local Django server.

The existing Expo project `dailychallenge` is already linked. Its id, `5d85316c-87b1-4d6e-9ded-649ce535e8d4`, is in `dailychallenge/app.json`. Skip `eas init`.

From `finalproject/dailychallenge`, after `npm install`:

```powershell
npm install -g eas-cli
eas login
npm run eas-deploy
```

`npm run eas-deploy` exports the site into `dist/` and then uploads that folder. `eas deploy` by itself fails when `dist/` is missing. The hosted page is HTTPS, so it cannot call the HTTP API in the browser. Its `/api` route forwards to `http://13.56.184.13:8000`. `npm run eas-build` builds the iOS and Android apps, and those call the EC2 API directly. The API is plain HTTP, so the iOS and Android settings allow that host.

## Redux

`dailychallenge/state/store.ts` builds the store. Slices:

- `authSlice` — login, register, logout, and profile update thunks.
- `groupsSlice` — list, create, join, and the selected group.
- `challengesSlice` — the list, today’s dare, and custom challenges.
- `submissionsSlice` — proof and reactions.
- `messagesSlice` — the chat.
- `leaderboardSlice` — the board.

Those thunks are the middleware that talks to Django. A listener on the store refetches the leaderboard after proof is sent or a reaction changes, so the board is not a second source of truth the screens have to remember.

The token and the selected group id are stored with AsyncStorage and restored by `state/bootstrap.ts` when the app opens.

## Database

SQLite file: `djangobackend/db.sqlite3`. Tables:

- `auth_user` and `authtoken_token` — Django accounts and API tokens.
- `rally_profile` — display name and bio, one row per user.
- `rally_friendgroup` — name, description, unique invite code.
- `rally_membership` — user, group, role. One membership per pair.
- `rally_challenge` — daily or custom, proof kind, date. One daily challenge per group per date.
- `rally_submission` — one proof per user per challenge. Text, optional photo, optional video URL.
- `rally_reaction` — fire, cheer, or laugh. One of each kind per user per proof.
- `rally_message` — group chat rows.
- `rally_pointevent` — the points ledger. The board sums these rows.

Points are not a column someone can edit out of band. Deleting a reaction removes the points that reaction awarded.

## Layout

- `djangobackend/dailychallenge/models.py` — tables.
- `djangobackend/dailychallenge/views.py` and `urls.py` — the API.
- `djangobackend/dailychallenge/services.py` — points, streaks, the daily prompt, optional S3.
- `dailychallenge/app/(auth)` — sign in and sign up.
- `dailychallenge/app/(app)` — Today, Groups, Create, Board, Chat, Account.
- `dailychallenge/components` — shared buttons, fields, cards, the shell, proof, and submission cards.
- `deploy/ec2.ps1` — ship the API to 13.56.184.13.
