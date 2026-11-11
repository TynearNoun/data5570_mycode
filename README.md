# Plot Log

Plot Log is a field notebook for species counts. The plot board lists every sighting stored on the Django server. Logging a new one posts it to that server, and flagging or removing a card updates the same row. Both pages read the list from one Redux store, so the totals follow the data.

## What you can do

- Open the plot board to see every count, the total number of individuals, and how many plots are flagged.
- Switch the board to flagged plots only. That filter is local screen state; the counts themselves come from the server.
- Log a sighting with a site, a species, a count, and an optional note. Saving sends a POST request, then the board loads the new row.
- Flag a plot for a second look, or remove it. Those actions update the SQLite row and the board together.

The board starts with three sample plots created by the database migration.

The code is in [https://github.com/TynearNoun/data5570_mycode](https://github.com/TynearNoun/data5570_mycode).

## Hosted

The Expo app is at [https://plot-log--board.expo.app](https://plot-log--board.expo.app).

The API is at [https://dose-systematic-income-unity.trycloudflare.com/api/plots/](https://dose-systematic-income-unity.trycloudflare.com/api/plots/). That address is a Cloudflare tunnel to Django on the EC2 instance `54.215.48.58`. The instance is Amazon Linux 2023, the login user is `ec2-user`, and the app lives in `/home/ec2-user/plot-log/djangobackend`. Two systemd services keep it up: `plot-log-api` runs Django on port 8000, and `plot-log-tunnel` runs `cloudflared`. Restarting the tunnel assigns a new `trycloudflare.com` address, and the Expo app keeps the address that was baked in at export time, so leave that service running.

## Run it locally

You need Node.js 20 or newer (Node 22 is a safe choice for this Expo SDK) and Python 3.12.

Start the API first:

```bash
cd djangobackend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py test
python manage.py runserver 0.0.0.0:8000
```

The list endpoint is [http://127.0.0.1:8000/api/plots/](http://127.0.0.1:8000/api/plots/). Django REST framework also serves a browsable page at that address.

In a second terminal, start the Expo app:

```bash
cd expo-app
npm install
npm run web
```

The web app opens at [http://localhost:8081](http://localhost:8081). `npm run ios` and `npm run android` start the same project in a simulator. A phone cannot reach `127.0.0.1` on your computer, so point it at the machine or tunnel address before you launch Expo:

```bash
EXPO_PUBLIC_DJANGO_API_URL=http://YOUR_ADDRESS:8000/api npm run web
```

Expo reads `EXPO_PUBLIC_` variables when the bundle is built. Change the value and start or export again after the API address changes. `expo-app/.env.example` shows the variable name.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/plots/` | List every plot. The board loads this with a Redux thunk. |
| POST | `/api/plots/` | Create a plot. The log form sends this with a Redux thunk. |
| PATCH | `/api/plots/{id}/` | Update a plot. Flagging sends `{ "flagged": true }` or `{ "flagged": false }`. |
| DELETE | `/api/plots/{id}/` | Remove a plot. |

POST body:

```json
{
  "site": "Cedar Bend",
  "species": "American robin",
  "count": 6,
  "note": "Foraging along the gravel bar."
}
```

`count` has to be a whole number of at least 1. `site` and `species` are required. `note` can be empty.

The database is the SQLite file `djangobackend/db.sqlite3`, created by `migrate`. To use Amazon RDS instead, set `DATABASES` in `djangobackend/djangobackend/settings.py` to the RDS engine, host, name, user, and password. Keep those values in the server environment rather than in the repository.

## CORS while you develop

The API installs `django-cors-headers` from `requirements.txt`. `settings.py` lists `corsheaders` in `INSTALLED_APPS` and puts `corsheaders.middleware.CorsMiddleware` before `SecurityMiddleware`. `ALLOWED_HOSTS` defaults to `*`.

`CORS_ALLOW_ALL_ORIGINS` defaults to true so Expo web, a simulator, and an Expo Hosting origin can call the API before you know the final address. This is for the class project only. When you know the hosted origin, set `CORS_ALLOW_ALL_ORIGINS=false` and add that origin to `CORS_ALLOWED_ORIGINS`. The local Expo web origins are already listed:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
]
```

## Host the API on the EC2 instance

On the Ubuntu EC2 instance:

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip
git clone https://github.com/TynearNoun/data5570_mycode.git
cd data5570_mycode/djangobackend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Open port 8000 in the instance security group if you call the API by the public IP. For HTTPS, install `cloudflared` and open a tunnel after the Django server is running:

```bash
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-archive-keyring.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-archive-keyring.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update
sudo apt install -y cloudflared
cloudflared tunnel --url http://localhost:8000
```

Cloudflare prints an `https://….trycloudflare.com` address. The API base the app needs is that address plus `/api`, for example `https://random-name.trycloudflare.com/api`. The quick tunnel URL changes each time you start it. Put the EC2 public IP or the tunnel hostname in `ALLOWED_HOSTS` if you stop using `*`.

`runserver` matches the class setup. It is the development server.

## Host the Expo app

The web UI is an Expo Router app with `web.output` set to `static`, which Expo Hosting can deploy. From `expo-app`, with the [EAS CLI](https://docs.expo.dev/eas/hosting/get-started/) installed and `eas login` already done:

```bash
cd expo-app
eas init
EXPO_PUBLIC_DJANGO_API_URL=https://YOUR_TUNNEL.trycloudflare.com/api npx expo export --platform web
eas deploy
```

`eas deploy` prints a preview URL such as `https://plot-log--something.expo.app`. Export again whenever the API URL changes, because Expo inlines `EXPO_PUBLIC_DJANGO_API_URL` into the web bundle. The steps are the Expo Hosting guide: [https://docs.expo.dev/eas/hosting/get-started/](https://docs.expo.dev/eas/hosting/get-started/).

## Project layout

- `expo-app/app/index.tsx` is the plot board.
- `expo-app/app/log.tsx` is the sighting form.
- `expo-app/state/store.ts` creates the Redux store. `plotsReducer.ts` defines the `fetchPlots` and `createPlot` thunks, plus flag and delete thunks.
- `djangobackend/plots` is the Django REST framework app: model, serializer, viewset, and SQLite migrations.

## Customer API

The `django/` folder is an earlier customer API and is separate from Plot Log. From the repository root:

```bash
python3 -m venv myvenv
source myvenv/bin/activate
python3 -m pip install -r requirements.txt
cd django
python3 manage.py migrate
python3 manage.py runserver 0.0.0.0:8000
```

`GET` and `POST /api/customers/` list and create customers. `GET /api/customers/stats/` returns counts by status. `/` is the dashboard and `/admin/` is the Django admin.
