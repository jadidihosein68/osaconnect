from __future__ import annotations

from rest_framework import serializers

from .models import MessageTemplate


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = [
            "id",
            "name",
            "channel",
            "language",
            "subject",
            "body",
            "variables",
            "category",
            "approved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_variables(self, variables):
        if not isinstance(variables, list):
            raise serializers.ValidationError("Variables must be a list of placeholder names.")
        return variables

    def validate(self, attrs):
        body = attrs.get("body", "")
        variables = attrs.get("variables", [])
        missing_in_body = [var for var in variables if f"{{{{{var}}}}}" not in body]
        if missing_in_body:
            raise serializers.ValidationError(f"Body is missing placeholders for: {', '.join(missing_in_body)}")
        return attrs
