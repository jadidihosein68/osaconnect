from rest_framework import serializers
from .models import EmailAttachment
from organizations.utils import get_current_org

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"}
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

class EmailAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAttachment
        fields = ["id", "filename", "content_type", "size", "file", "created_at"]
        read_only_fields = ["filename", "content_type", "size", "created_at"]

    def create(self, validated_data):
        request = self.context.get("request")
        org = get_current_org(request)
        file = validated_data.get("file")
        if not file:
            raise serializers.ValidationError({"file": "File is required"})
        if file.size > MAX_ATTACHMENT_SIZE:
            raise serializers.ValidationError({"file": "File too large (max 10MB)."})
        if file.content_type not in ALLOWED_TYPES:
            raise serializers.ValidationError({"file": "Unsupported file type."})
        return EmailAttachment.objects.create(
            organization=org,
            file=file,
            filename=file.name,
            content_type=file.content_type,
            size=file.size,
        )
