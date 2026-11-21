from django.urls import path
from .views import SemanticSearchView

urlpatterns = [
    # POST /api/search/
    path("search/", SemanticSearchView.as_view(), name="semantic-search"),
]
