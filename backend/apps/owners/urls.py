from django.urls import path
from . import views

urlpatterns = [
    path("", views.OwnerListCreateView.as_view(), name="owners-list"),
    path("<int:pk>/", views.OwnerDetailView.as_view(), name="owners-detail"),
]
