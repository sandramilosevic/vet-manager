from django.contrib import admin
from .models import Pet, Vaccination


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "species", "gender")
    list_filter = ("species", "gender")
    search_fields = ("name", "owner__first_name", "owner__last_name")


@admin.register(Vaccination)
class VaccinationAdmin(admin.ModelAdmin):
    list_display = ("pet", "vaccine_name", "date_given", "next_due")
    list_filter = ("vaccine_name",)
