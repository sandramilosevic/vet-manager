from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.accounts.views import ThrottledTokenObtainPairView

# API version control
# All versioned API endpoints live here
# old clients on v1 keep working unchanged while new
# clients can opt into the newer behavior
v1_patterns = [
    path("auth/login/", ThrottledTokenObtainPairView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("accounts/", include("apps.accounts.urls")),
    path("clinics/", include("apps.clinics.urls")),
    path("owners/", include("apps.owners.urls")),
    path("pets/", include("apps.pets.urls")),
    path("medical-records/", include("apps.medical_records.urls")),
]


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(v1_patterns)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
