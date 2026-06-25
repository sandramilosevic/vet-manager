from django.contrib import admin
from .models import Pet, Vaccination

admin.site.register(Pet)
admin.site.register(Vaccination)