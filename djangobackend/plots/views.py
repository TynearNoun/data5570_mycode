from rest_framework import viewsets

from .models import Plot
from .serializers import PlotSerializer


class PlotViewSet(viewsets.ModelViewSet):
    """
    Species counts stored in SQLite.

    GET    /api/plots/        list every plot
    POST   /api/plots/        create a plot
    GET    /api/plots/{id}/   retrieve one plot
    PATCH  /api/plots/{id}/   update fields such as flagged
    DELETE /api/plots/{id}/   remove a plot
    """

    queryset = Plot.objects.all()
    serializer_class = PlotSerializer
