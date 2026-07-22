from django.urls import path
from . import views

urlpatterns = [
    path("me/", views.MeView.as_view(), name="me"),
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    # One URL, two methods: GET lists invitations, POST sends one.
    path(
        "invitations/",
        views.InvitationListCreateView.as_view(),
        name="send-invitation",
    ),
    path(
        "invitations/accept/",
        views.AcceptInvitationView.as_view(),
        name="accept-invitation",
    ),
    path(
        "invitations/<int:invitation_id>/revoke/",
        views.RevokeInvitationView.as_view(),
        name="revoke-invitation",
    ),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path(
        "password-reset/",
        views.PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
]
