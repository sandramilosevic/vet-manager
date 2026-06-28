from django.urls import path
from . import views

urlpatterns = [
    path("clinic/", views.ClinicView.as_view(), name="clinic"),
    path(
        "clinic/working-hours/",
        views.WorkingHoursListCreateView.as_view(),
        name="working-hours-list",
    ),
    path(
        "clinic/working-hours/<int:pk>/",
        views.WorkingHoursDetailView.as_view(),
        name="working-hours-detail",
    ),
]
