from __future__ import annotations

from pathlib import Path

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView


class AssistantView(APIView):
    """Lightweight stub that simulates KB-backed responses."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        question = request.data.get("question", "")
        kb_path = Path(settings.ASSISTANT_KB_PATH)
        kb_text = kb_path.read_text() if kb_path.exists() else ""
        answer = self._answer_from_kb(question, kb_text)
        return Response({"question": question, "answer": answer})

    @staticmethod
    def _answer_from_kb(question: str, kb_text: str) -> str:
        if not kb_text:
            return "Knowledge base is empty. Provide content to enable answers."
        question_lower = question.lower()
        for line in kb_text.splitlines():
            if question_lower.split(" ")[0] in line.lower():
                return line.strip()
        return "Answer generated from KB stub; integrate LLM provider for production."
