from __future__ import annotations

from rest_framework import serializers

from .models import MessageTemplate


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = [
            "id",
            "organization",
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
        read_only_fields = ["created_at", "updated_at", "organization"]

    def validate_variables(self, variables):
        if not isinstance(variables, list):
            raise serializers.ValidationError("Variables must be a list.")
        normalized = []
        for item in variables:
            if isinstance(item, str):
                name = item.strip()
                fallback = ""
            elif isinstance(item, dict):
                name = (item.get("name") or "").strip()
                fallback = item.get("fallback", "")
            else:
                raise serializers.ValidationError("Each variable must be an object with 'name' and optional 'fallback'.")
            if not name:
                raise serializers.ValidationError("Variable name cannot be empty.")
            normalized.append({"name": name, "fallback": fallback})
        return normalized

    def validate(self, attrs):
        body = attrs.get("body", "")
        variables = attrs.get("variables", [])
        names_missing = [var["name"] for var in variables if f"{{{var['name']}}}" not in body]
        if names_missing:
            raise serializers.ValidationError(f"Body is missing placeholders for: {', '.join(names_missing)}")
        return attrs
