from django.urls import path
from . import views

urlpatterns = [
    path("", views.PetListCreateView.as_view(), name="pets"),
    path("<int:pk>/", views.PetDetailView.as_view(), name="pet-details"),
    path(
        "vaccinations/",
        views.VaccinationListCreateView.as_view(),
        name="vaccinations",
    ),
    path(
        "vaccinations/<int:pk>/",
        views.VaccinationDetailView.as_view(),
        name="vaccinations-details",
    ),
]
