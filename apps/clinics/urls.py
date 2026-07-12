from django.urls import path
from . import views

urlpatterns = [
    path("", views.ClinicView.as_view(), name="clinic"),
    path("locations/", views.ClinicListCreateView.as_view(), name="clinic-locations"),
    path(
        "locations/<int:pk>/",
        views.ClinicDetailView.as_view(),
        name="clinic-location-detail",
    ),
]
