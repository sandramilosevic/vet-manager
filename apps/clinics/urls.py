from django.urls import path
from . import views

urlpatterns = [
    path("clinic/", views.ClinicView.as_view(), name="clinic"),
]
