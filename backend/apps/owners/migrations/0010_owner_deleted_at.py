# Generated manually to fix perform_destroy() crashing with:
# ValueError: The following fields do not exist in this model...: deleted_at
# owners/views.py already set instance.deleted_at, but the field was
# never added to the Owner model (unlike MedicalRecord, which has both
# is_deleted and deleted_at).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("owners", "0009_owner_is_deleted"),
    ]

    operations = [
        migrations.AddField(
            model_name="owner",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
