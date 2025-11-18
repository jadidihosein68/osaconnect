from __future__ import annotations

from pathlib import Path

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from organizations.utils import get_current_org


class AssistantView(APIView):
    """Lightweight KB-backed helper with provider hooks."""

    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get("question", "")
        org = get_current_org(request)
        kb_path = Path(settings.ASSISTANT_KB_PATH)
        kb_text = kb_path.read_text() if kb_path.exists() else ""
        answer, snippets = self._answer_from_kb(question, kb_text)
        provider = getattr(settings, "ASSISTANT_PROVIDER", "stub")
        return Response(
            {
                "question": question,
                "answer": answer,
                "provider": provider,
                "org": org.id,
                "snippets": snippets,
            }
        )

    @staticmethod
    def _answer_from_kb(question: str, kb_text: str) -> tuple[str, list[str]]:
        if not kb_text:
            return "Knowledge base is empty. Provide content to enable answers.", []
        question_lower = question.lower()
        matches = []
        for line in kb_text.splitlines():
            if question_lower.split(" ")[0] in line.lower():
                matches.append(line.strip())
        if matches:
            return matches[0], matches
        return "Answer generated from KB stub; integrate LLM provider for production.", []
