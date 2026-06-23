from django.contrib import admin
from .models import User, Invitation

admin.site.register(User)
admin.site.register(Invitation)
