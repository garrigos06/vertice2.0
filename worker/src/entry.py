"""Cloudflare Worker entrypoint.

Ponte oficial FastAPI ↔ Workers via módulo `asgi` do runtime.
Também expõe `self.env` (D1 binding, secrets, vars) para as rotas via ContextVar.
"""
from workers import WorkerEntrypoint
import asgi

from app import app
from deps import set_current_env


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        # Torna o binding acessível para qualquer rota FastAPI durante este request.
        set_current_env(self.env)
        return await asgi.fetch(app, request, self.env)
