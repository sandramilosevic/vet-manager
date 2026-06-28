from django.urls import path
from . import views

urlpatterns = [
    path("owners/", views.OwnerListCreateView.as_view(), name="owners-list"),
    path("owners/<int:pk>/", views.OwnerDetailView.as_view(), name="owners-detail"),
]
