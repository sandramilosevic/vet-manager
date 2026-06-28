from django.urls import path
from . import views

urlpatterns = [
    path(
        "medical-records/",
        views.MedicalRecordListCreateView.as_view(),
        name="medical-record-list",
    ),
    path(
        "medical-records/<int:pk>/",
        views.MedicalRecordDetailView.as_view(),
        name="medical-record-detail",
    ),
]
