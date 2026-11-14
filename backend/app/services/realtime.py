"""WebSocket ulanishlari menejeri. Sync endpointlardan ham xavfsiz publish qilish mumkin."""
import asyncio
import logging
from collections import defaultdict
from fastapi import WebSocket

log = logging.getLogger("ws")


class Hub:
    def __init__(self):
        self.conns: dict[str, set[WebSocket]] = defaultdict(set)
        self.loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, user_id: str, ws: WebSocket):
        self.loop = asyncio.get_running_loop()
        self.conns[user_id].add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        self.conns[user_id].discard(ws)
        if not self.conns[user_id]:
            self.conns.pop(user_id, None)

    async def _send(self, user_id: str, payload: dict):
        for ws in list(self.conns.get(user_id, ())):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(user_id, ws)

    def publish(self, user_id: str, payload: dict):
        """Istalgan thread'dan chaqirish mumkin."""
        if not self.loop or user_id not in self.conns:
            return
        try:
            asyncio.run_coroutine_threadsafe(self._send(user_id, payload), self.loop)
        except Exception:
            log.exception("publish xato")


hub = Hub()
