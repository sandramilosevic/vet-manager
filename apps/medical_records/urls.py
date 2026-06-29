from django.urls import path
from . import views

urlpatterns = [
    path(
        "",
        views.MedicalRecordListCreateView.as_view(),
        name="medical-record-list",
    ),
    path(
        "<int:pk>/",
        views.MedicalRecordDetailView.as_view(),
        name="medical-record-detail",
    ),
]
