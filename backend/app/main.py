from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, tasks, admin

app = FastAPI(title="Role-Based To-Do API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}


