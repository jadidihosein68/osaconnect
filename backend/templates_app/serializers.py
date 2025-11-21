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
            "footer",
            "is_default",
            "approved",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "organization", "approved_by", "approved_at"]

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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # ensure only one default per org/channel
        request = self.context.get("request")
        org = getattr(request, "organization", None) or getattr(getattr(request, "user", None), "organization", None)
        instance = getattr(self, "instance", None)
        if attrs.get("is_default") and org:
            qs = MessageTemplate.objects.filter(organization=org, channel=attrs.get("channel"))
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.filter(is_default=True).exists():
                raise serializers.ValidationError({"is_default": "A default template already exists for this channel."})
        return attrs
