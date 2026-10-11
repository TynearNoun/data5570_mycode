# data5570_mycode — Django Customer API

A Django 6 backend with a `Customer` model stored in the built-in SQLite database, a
Django REST Framework CRUD API, the Django admin, and a small dashboard page that reads
from the API so you can see traffic hitting the endpoint in a browser.

- `GET/POST /api/customers/` — list (paginated, searchable) and create customers
- `GET/PUT/PATCH/DELETE /api/customers/<id>/` — retrieve and modify one customer
- `GET /api/customers/stats/` — counts by status
- `/admin/` — Django admin, with `Customer` registered
- `/` — dashboard that lists, creates, and deletes customers through the API

## Project layout

```
.
├── myvenv/                     # virtual environment (git-ignored)
├── requirements.txt
├── expo-app/                   # Expo app (not inside the Django project)
└── django/
    ├── manage.py
    ├── db.sqlite3              # created by migrate (git-ignored)
    ├── myproject/settings.py   # INSTALLED_APPS: rest_framework, corsheaders, customers
    ├── myproject/urls.py       # /, /admin/, /api/, /api-auth/
    ├── templates/customers/home.html
    └── customers/
        ├── models.py           # Customer model
        ├── serializers.py      # CustomerSerializer
        ├── views.py            # CustomerViewSet + HomeView
        ├── urls.py             # DRF router
        ├── admin.py            # CustomerAdmin
        ├── tests.py            # model + API tests
        └── management/commands/seed_customers.py
```

## Expo app

`expo-app` is the Expo field notebook, created with Create Expo Stack. It sits next to `django`, not inside it. The plot board and the sighting form share a Redux store.

```bash
cd expo-app
npm install
npm run web
```

Node.js 20 or newer is required. `npm run web` opens the board in the browser. `npm run ios` and `npm run android` start a simulator.

## Run it locally

```bash
# 1. Create the virtual environment (only needed once)
python3 -m venv myvenv

# 2. Activate it — do this again in every new terminal
source myvenv/bin/activate

# 3. Install dependencies
python3 -m pip install -r requirements.txt

# 4. Create the SQLite tables
cd django
python3 manage.py makemigrations
python3 manage.py migrate

# 5. Create an admin login
python3 manage.py createsuperuser

# 6. (Optional) Insert sample customers
python3 manage.py seed_customers

# 7. Start the development server
python3 manage.py runserver 0.0.0.0:8000
```

From the repository root, `./runserver.sh` does steps 2 and 7 in one go and prints
every URL the server answers on.

Then open:

- `http://54.176.159.190:8000/` — dashboard
- `http://54.176.159.190:8000/api/customers/` — browsable API
- `http://54.176.159.190:8000/admin/` — inspect the `customers_customer` table

On a local machine use `http://127.0.0.1:8000` instead of the public IP.

### Why the server binds `0.0.0.0` and not `54.176.159.190`

`python3 manage.py runserver 54.176.159.190:8000` fails with
`Error: That IP address can't be assigned to.` A listening socket can only bind an
address that exists on a local network interface. An EC2 instance's public IP is not
configured on its NIC — AWS maps it to the instance's private address — so the public
IP is an address clients *connect to*, never one the process binds. `0.0.0.0` means
"every interface on this machine", which is what makes the public IP reachable.

If `http://54.176.159.190:8000/` times out, the server is fine and the network is
blocking you: open inbound TCP 8000 to your IP in the instance's EC2 security group.

### Admin credentials used in this environment

| Username | Password |
| --- | --- |
| `admin` | `Data5570admin!` |

These are development-only credentials. `db.sqlite3` is git-ignored, so anyone cloning
the repo creates their own superuser in step 5.

## The Customer model

```python
class Customer(models.Model):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    company = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PROSPECT)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

`status` is one of `active`, `prospect`, or `churned`.

## Try the API

```bash
# List customers
curl http://127.0.0.1:8000/api/customers/

# Search and filter
curl "http://127.0.0.1:8000/api/customers/?search=northwind&status=active"

# Create one
curl -X POST http://127.0.0.1:8000/api/customers/ \
  -H 'Content-Type: application/json' \
  -d '{"first_name":"John","last_name":"Doe","email":"john.doe@example.com","phone_number":"123-456-7890"}'

# Counts by status
curl http://127.0.0.1:8000/api/customers/stats/
```

You can also add rows from the Django shell, the way the assignment describes:

```bash
python3 manage.py shell
>>> from customers.models import Customer
>>> Customer.objects.create(first_name="John", last_name="Doe", email="john.doe@example.com", phone_number="123-456-7890")
```

## Tests

```bash
source myvenv/bin/activate
cd django
python3 manage.py test
```

## Configuration

Settings read a few optional environment variables so the same code works locally and on
an EC2 box:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | insecure dev key | Signing key |
| `DJANGO_DEBUG` | `True` | Set to `False` for anything public-facing |
| `DJANGO_EC2_PUBLIC_IP` | `54.176.159.190` | Public address used for allowed hosts and CSRF origins |
| `DJANGO_SERVER_PORT` | `8000` | Port used by `runserver.sh` and the CSRF origins |
| `DJANGO_ALLOWED_HOSTS` | the public IP plus localhost | Comma-separated hostnames/IPs; overrides the default list |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | the public IP and localhost on the server port | Comma-separated origins, e.g. `http://1.2.3.4:8000` |

If the instance's public IP changes, set `DJANGO_EC2_PUBLIC_IP` rather than editing
settings:

```bash
DJANGO_EC2_PUBLIC_IP=203.0.113.25 ./runserver.sh
```

## Handy commands

```bash
source myvenv/bin/activate                                   # activate the venv
python3 manage.py createsuperuser                             # make an admin user
python3 manage.py makemigrations && python3 manage.py migrate  # after editing models.py
```
