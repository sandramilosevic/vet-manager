from django.db import models

class ClinicGroup(models.Model):
    """Represents a group of clinics (e.g. a hospital chain or franchise)."""

    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Clinic(models.Model):
    """A single clinic belonging to a ClinicGroup."""

    group = models.ForeignKey(
        ClinicGroup, 
        on_delete=models.CASCADE, 
        related_name='clinics',
        )
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(max_length=254)

    def __str__(self):
        return f'{self.name} ({self.city})'

class WorkingHours(models.Model):
    """Working hours for a specific weekday in a clinic."""

    
    class Weekday(models.IntegerChoices):
        MONDAY = 1, 'Monday'
        TUESDAY = 2, 'Tuesday'
        WEDNESDAY = 3, 'Wednesday'
        THURSDAY = 4, 'Thursday'
        FRIDAY = 5, 'Friday'
        SATURDAY = 6, 'Saturday'
        SUNDAY = 7, 'Sunday'

    clinic = models.ForeignKey(
        Clinic, 
        on_delete=models.CASCADE, 
        related_name='working_hours',
        )
    
    # Integer value mapped to a day of the week (1=Monday, 7=Sunday)
    weekday = models.IntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f'{self.clinic} - {self.get_weekday_display()}'
