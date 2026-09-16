from django.db.models import Count
from django.views.generic import TemplateView
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Customer
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    """Full CRUD for customers at /api/customers/."""

    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    search_fields = ['first_name', 'last_name', 'email', 'company']
    ordering_fields = ['last_name', 'created_at', 'status']

    def get_queryset(self):
        queryset = super().get_queryset()
        requested_status = self.request.query_params.get('status')
        if requested_status:
            queryset = queryset.filter(status=requested_status)
        return queryset

    @action(detail=False, methods=['get'])
    def stats(self, request):
        counts = {
            row['status']: row['total']
            for row in Customer.objects.values('status').annotate(total=Count('id'))
        }
        return Response(
            {
                'total': Customer.objects.count(),
                'by_status': {
                    value: counts.get(value, 0) for value, _ in Customer.Status.choices
                },
            },
            status=status.HTTP_200_OK,
        )


class HomeView(TemplateView):
    template_name = 'customers/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['status_choices'] = Customer.Status.choices
        return context
