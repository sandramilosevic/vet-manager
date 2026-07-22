from django.urls import path
from . import views

urlpatterns = [
    path("", views.PetListCreateView.as_view(), name="pets"),
    # Declared before "<int:pk>/" so the literal prefix always wins, even if
    # the converter list changes later.
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
    path(
        "vaccinations/<int:pk>/history/",
        views.VaccinationHistoryView.as_view(),
        name="vaccination-history",
    ),
    path("<int:pk>/", views.PetDetailView.as_view(), name="pet-details"),
    path("<int:pk>/history/", views.PetHistoryView.as_view(), name="pet-history"),
]
