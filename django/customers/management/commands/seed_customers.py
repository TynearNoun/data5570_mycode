from django.core.management.base import BaseCommand

from customers.models import Customer

SAMPLE_CUSTOMERS = [
    {
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john.doe@example.com',
        'phone_number': '123-456-7890',
        'company': 'Doe Logistics',
        'status': Customer.Status.ACTIVE,
        'notes': 'First record created for the assignment walkthrough.',
    },
    {
        'first_name': 'Maria',
        'last_name': 'Alvarez',
        'email': 'maria.alvarez@northwind.test',
        'phone_number': '435-555-0142',
        'company': 'Northwind Analytics',
        'status': Customer.Status.ACTIVE,
        'notes': 'Renewed the annual plan; wants quarterly reporting.',
    },
    {
        'first_name': 'Priya',
        'last_name': 'Raman',
        'email': 'priya.raman@blueharbor.test',
        'phone_number': '801-555-0117',
        'company': 'Blue Harbor Freight',
        'status': Customer.Status.PROSPECT,
        'notes': 'Requested a pilot after the spring demo.',
    },
    {
        'first_name': 'Sam',
        'last_name': 'Okafor',
        'email': 'sam.okafor@cachevalley.test',
        'phone_number': '385-555-0198',
        'company': 'Cache Valley Supply',
        'status': Customer.Status.CHURNED,
        'notes': 'Left for an in-house tool; revisit next budget cycle.',
    },
]


class Command(BaseCommand):
    help = 'Insert sample customers so the API and admin have data to show.'

    def handle(self, *args, **options):
        created_count = 0
        for record in SAMPLE_CUSTOMERS:
            _, created = Customer.objects.get_or_create(
                email=record['email'], defaults=record
            )
            created_count += int(created)

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {created_count} new customer(s); '
                f'{Customer.objects.count()} total in the database.'
            )
        )
