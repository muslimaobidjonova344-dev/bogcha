from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

log = logging.getLogger("app")


class AppError(Exception):
    def __init__(self, message: str, status: int = 400, code: str = "bad_request"):
        self.message, self.status, self.code = message, status, code


def NotFound(msg="Topilmadi"): return AppError(msg, 404, "not_found")
def Forbidden(msg="Ruxsat yo'q"): return AppError(msg, 403, "forbidden")
def Unauthorized(msg="Tizimga kiring"): return AppError(msg, 401, "unauthorized")
def Conflict(msg="Ziddiyat"): return AppError(msg, 409, "conflict")


def install_error_handlers(app: FastAPI):
    @app.exception_handler(AppError)
    async def _app_err(_: Request, e: AppError):
        return JSONResponse({"error": {"code": e.code, "message": e.message}}, status_code=e.status)

    @app.exception_handler(RequestValidationError)
    async def _val_err(_: Request, e: RequestValidationError):
        fields = [{"field": ".".join(str(x) for x in err["loc"][1:]), "message": err["msg"]} for err in e.errors()]
        return JSONResponse({"error": {"code": "validation", "message": "Ma'lumotlar noto'g'ri", "fields": fields}}, status_code=422)

    @app.exception_handler(Exception)
    async def _any(_: Request, e: Exception):
        log.exception("Kutilmagan xato")
        return JSONResponse({"error": {"code": "server_error", "message": "Server xatosi"}}, status_code=500)
