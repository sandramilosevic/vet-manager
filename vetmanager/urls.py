from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("accounts/", include("apps.accounts.urls")),
    path("clinics/", include("apps.clinics.urls")),
    path("owners/", include("apps.owners.urls")),
    path("pets/", include("apps.pets.urls")),
    path("medical-records/", include("apps.medical_records.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
