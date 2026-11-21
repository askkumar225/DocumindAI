from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .serializers import RegisterSerializer, UserProfileSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/

    Register a new user.

    Request body:
        {
            "username": "ashok",
            "email": "ashok@example.com",
            "password": "StrongPassword123",
            "role": "EMPLOYEE",       # optional, defaults to EMPLOYEE
            "department": "Finance"   # optional
        }

    Response 201:
        {
            "message": "User created successfully",
            "username": "ashok",
            "email": "ashok@example.com"
        }
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Issue JWT tokens immediately on registration
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "User created successfully",
                "username": user.username,
                "email": user.email,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/

    Authenticate with username + password.
    Returns JWT access + refresh tokens plus user profile.

    This is a thin wrapper around SimpleJWT that also returns
    user role/department in the same response.

    Request body:
        {
            "username": "ashok",
            "password": "StrongPassword123"
        }

    Response 200:
        {
            "access": "...",
            "refresh": "...",
            "user": { "id": 1, "username": "ashok", "role": "EMPLOYEE", ... }
        }
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        from django.contrib.auth import authenticate

        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")

        if not username or not password:
            return Response(
                {"error": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        profile = UserProfileSerializer(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": profile.data,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    GET /api/auth/me/

    Returns the currently authenticated user's profile.
    Requires: Authorization: Bearer <access_token>
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class LogoutView(APIView):
    """
    POST /api/auth/logout/

    Blacklist the provided refresh token so it can no longer be used
    to obtain new access tokens.

    Requires authentication (Bearer access token in header).

    Request body:
        {
            "refresh": "<refresh_token>"
        }

    Response 200:
        {
            "message": "Logout successful"
        }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh", "")

        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": "Logout successful"},
            status=status.HTTP_200_OK,
        )
