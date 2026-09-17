from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile


def _user_payload(user):
    try:
        role = user.profile.role
    except Profile.DoesNotExist:
        role = Profile.ROLE_ADMIN if user.is_superuser else Profile.ROLE_PARALEGAL
    return {'id': user.pk, 'username': user.username, 'role': role}


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({'detail': 'Invalid credentials.'}, status=400)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': _user_payload(user)})


class LogoutView(APIView):
    def post(self, request):
        request.auth.delete()
        return Response(status=204)


class MeView(APIView):
    def get(self, request):
        return Response(_user_payload(request.user))
