"""
Government-compliant background job scheduler
* Persistent (PostgreSQL job store)
* Time-zone aware (UTC)
* Full audit logging
* Graceful start / shutdown
* Configurable via settings
* Health-check endpoint ready
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Callable

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import (
    EVENT_JOB_EXECUTED,
    EVENT_JOB_ERROR,
    EVENT_JOB_MISSED,
    EVENT_JOB_MAX_INSTANCES,
)
from sqlalchemy import create_engine
from app.core.config import settings
from app.core.database import engine  # async engine from base.py
from app.jobs.password_expiration_check import check_password_expirations
from app.jobs.session_timeout_check import check_session_expirations
from app.jobs.session_cleanup_check import cleanup_expired_sessions
from app.jobs.financial_calculation_job import calculate_daily_financials  # Import financial job

logger = logging.getLogger(__name__)

# APScheduler's SQLAlchemyJobStore only works with sync engines
sync_engine = create_engine(str(settings.DATABASE_URL).replace("+asyncpg", ""))


# ----------------------------------------------------------------------
# 1. Job Store – PostgreSQL (persists across restarts)
# ----------------------------------------------------------------------
job_stores = {
    "default": SQLAlchemyJobStore(
        engine=sync_engine,
        tablename="apscheduler_jobs",
    )
}
# ----------------------------------------------------------------------
# 2. Scheduler (singleton)
# ----------------------------------------------------------------------
scheduler = AsyncIOScheduler(
    jobstores=job_stores,
    job_defaults={
        "coalesce": True,          # run once if multiple triggers fire
        "max_instances": 1,        # prevent overlapping runs
        "misfire_grace_time": 60,  # seconds
    },
    timezone="UTC",                # explicit, auditable
)


# ----------------------------------------------------------------------
# 3. APScheduler event listeners (audit trail)
# ----------------------------------------------------------------------
def _log_job_event(event, level: int = logging.INFO) -> None:
    """Centralised audit logger for every job event."""
    job = scheduler.get_job(event.job_id)
    msg = (
        f"Job '{job.id}' ({job.name}) – "
        f"trigger={event.__class__.__name__} – "
        f"scheduled={event.scheduled_time.isoformat()}"
    )
    if hasattr(event, "exception"):
        msg += f" – exception={event.exception}"
    logger.log(level, msg)


def _on_job_executed(event) -> None:
    _log_job_event(event, logging.INFO)


def _on_job_error(event) -> None:
    _log_job_event(event, logging.ERROR)


def _on_job_missed(event) -> None:
    _log_job_event(event, logging.WARNING)


def _on_job_max_instances(event) -> None:
    _log_job_event(event, logging.WARNING)


# Register listeners
scheduler.add_listener(_on_job_executed, EVENT_JOB_EXECUTED)
scheduler.add_listener(_on_job_error, EVENT_JOB_ERROR)
scheduler.add_listener(_on_job_missed, EVENT_JOB_MISSED)
scheduler.add_listener(_on_job_max_instances, EVENT_JOB_MAX_INSTANCES)


# ----------------------------------------------------------------------
# 4. Job definitions (driven by settings)
# ----------------------------------------------------------------------
def _add_job(
    func: Callable,
    trigger: CronTrigger | IntervalTrigger,
    job_id: str,
    name: str,
) -> None:
    """Wrapper that adds common safety args."""
    scheduler.add_job(
        func,
        trigger=trigger,
        id=job_id,
        name=name,
        replace_existing=True,
        misfire_grace_time=60,
        coalesce=True,
        max_instances=1,
    )
    logger.info(f"Scheduled job: {job_id} – {name}")


def configure_jobs() -> None:
    """Register all recurring government-critical tasks."""
    # 1. Password expiration – daily at 00:05 UTC (avoid midnight rush)
    _add_job(
        check_password_expirations,
        CronTrigger(hour=0, minute=5, timezone="UTC"),
        "password_expiration_check",
        "Check Password Expirations",
    )

    # 2. Session timeout – every N minutes (configurable)
    _add_job(
        check_session_expirations,
        IntervalTrigger(
            minutes=settings.SESSION_TIMEOUT_CHECK_INTERVAL_MINUTES,
            timezone="UTC",
        ),
        "session_timeout_check",
        "Check Session Timeouts",
    )

    # 3. Session cleanup – every M minutes (configurable)
    _add_job(
        cleanup_expired_sessions,
        IntervalTrigger(
            minutes=settings.SESSION_CLEANUP_INTERVAL_MINUTES,
            timezone="UTC",
        ),
        "session_cleanup_check",
        "Cleanup Expired Sessions",
    )

    _add_job(
        calculate_daily_financials,
        CronTrigger(hour=1, minute=0, timezone="UTC"),
        "daily_financial_calculations",
        "Daily Financial Calculations",
    )


# ----------------------------------------------------------------------
# 5. Lifecycle helpers (used in main.py)
# ----------------------------------------------------------------------
@asynccontextmanager
async def lifespan_scheduler():
    """FastAPI lifespan – start & gracefully stop the scheduler."""
    try:
        configure_jobs()
        scheduler.start()
        logger.info("APScheduler started (persistent, UTC)")
        yield
    finally:
        if scheduler.running:
            logger.info("Shutting down APScheduler...")
            scheduler.shutdown(wait=True)
            logger.info("APScheduler stopped")


# ----------------------------------------------------------------------
# 6. Health-check helper (optional FastAPI endpoint)
# ----------------------------------------------------------------------
def get_scheduler_status() -> dict:
    """Return JSON-serialisable status for /healthz or monitoring."""
    jobs = [
        {
            "id": j.id,
            "name": j.name,
            "next_run": j.next_run_time.isoformat() if j.next_run_time else None,
        }
        for j in scheduler.get_jobs()
    ]
    return {
        "running": scheduler.running,
        "jobstore": "PostgreSQL",
        "jobs": jobs,
    }
