from django.test import TestCase
from django.urls import reverse

from .models import Customer


class CustomerModelTests(TestCase):
    def test_str_returns_full_name(self):
        customer = Customer.objects.create(
            first_name='John', last_name='Doe', email='john.doe@example.com'
        )
        self.assertEqual(str(customer), 'John Doe')

    def test_status_defaults_to_prospect(self):
        customer = Customer.objects.create(
            first_name='Ada', last_name='Byron', email='ada@example.com'
        )
        self.assertEqual(customer.status, Customer.Status.PROSPECT)


class CustomerAPITests(TestCase):
    def setUp(self):
        self.list_url = reverse('customer-list')
        self.customer = Customer.objects.create(
            first_name='Maria',
            last_name='Alvarez',
            email='maria@northwind.test',
            company='Northwind Analytics',
            status=Customer.Status.ACTIVE,
        )

    def test_list_returns_customers(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)

    def test_create_customer(self):
        response = self.client.post(
            self.list_url,
            {
                'first_name': 'Priya',
                'last_name': 'Raman',
                'email': 'Priya.Raman@Blueharbor.test',
                'phone_number': '801-555-0117',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['email'], 'priya.raman@blueharbor.test')
        self.assertEqual(Customer.objects.count(), 2)

    def test_duplicate_email_is_rejected(self):
        response = self.client.post(
            self.list_url,
            {
                'first_name': 'Other',
                'last_name': 'Person',
                'email': 'maria@northwind.test',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.json())

    def test_short_phone_number_is_rejected(self):
        response = self.client.post(
            self.list_url,
            {
                'first_name': 'Short',
                'last_name': 'Phone',
                'email': 'short@example.com',
                'phone_number': '12345',
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('phone_number', response.json())

    def test_search_filters_results(self):
        response = self.client.get(self.list_url, {'search': 'northwind'})
        self.assertEqual(response.json()['count'], 1)

        response = self.client.get(self.list_url, {'search': 'nothing-here'})
        self.assertEqual(response.json()['count'], 0)

    def test_status_filter(self):
        response = self.client.get(self.list_url, {'status': 'churned'})
        self.assertEqual(response.json()['count'], 0)

    def test_stats_endpoint(self):
        response = self.client.get(reverse('customer-stats'))
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['total'], 1)
        self.assertEqual(body['by_status']['active'], 1)

    def test_home_page_renders(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Customer Directory')
