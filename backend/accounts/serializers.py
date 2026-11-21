from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Validates:
        - password strength (Django's built-in validators)
        - unique username and email
        - optional role / department

    Write-only:
        - password (never returned in response)
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "role",
            "department",
        ]
        extra_kwargs = {
            "email": {"required": True},
            "role": {"required": False},
            "department": {"required": False},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data.get("role", "EMPLOYEE"),
            department=validated_data.get("department", ""),
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for the current user profile.
    Returned by GET /api/auth/me/
    """

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "department",
            "is_staff",
            "date_joined",
        ]
        read_only_fields = fields
