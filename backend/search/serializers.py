from rest_framework import serializers


class SearchQuerySerializer(serializers.Serializer):
    """
    Input serializer for POST /api/search/

    Fields:
        query       : The user's natural-language question (required).
        document_id : Restrict search to a single document (optional).
        top_k       : Max results to return, 1–20 (optional, default from settings).
    """

    query = serializers.CharField(
        max_length=1000,
        help_text="Natural-language question to search for.",
    )
    document_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Restrict search to a specific document ID.",
    )
    top_k = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=20,
        help_text="Number of results to return (default: SEARCH_TOP_K setting).",
    )


class SearchResultSerializer(serializers.Serializer):
    """
    One result item returned by POST /api/search/
    """

    chunk_id = serializers.IntegerField()
    document_id = serializers.IntegerField()
    document_title = serializers.CharField()
    document_type = serializers.CharField()
    chunk_index = serializers.IntegerField()
    page_number = serializers.IntegerField(allow_null=True)
    content = serializers.CharField()
    similarity = serializers.FloatField()


class SearchResponseSerializer(serializers.Serializer):
    """
    Full response envelope for POST /api/search/
    """

    query = serializers.CharField()
    total_results = serializers.IntegerField()
    results = SearchResultSerializer(many=True)
