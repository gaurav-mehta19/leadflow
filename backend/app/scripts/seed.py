import argparse
import asyncio
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import FixedClock, SystemClock
from app.core.config import get_settings
from app.core.database import Database
from app.core.logging import configure_logging, get_logger
from app.domain.commands import NewLead, NewNote
from app.domain.enums import LeadStatus
from app.repositories.maintenance_repository import MaintenanceRepository
from app.services.activity_service import ActivityService
from app.services.lead_service import LeadService

logger = get_logger("app.seed")


@dataclass(frozen=True, slots=True)
class Note:
    at: datetime
    body: str
    follow_up_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class StatusChange:
    at: datetime
    status: LeadStatus


type Step = Note | StatusChange


@dataclass(frozen=True, slots=True)
class DemoLead:
    created_at: datetime
    lead: NewLead
    steps: Sequence[Step]


class Timeline:
    def __init__(self, now: datetime, zone: ZoneInfo) -> None:
        self.now = now
        self.zone = zone
        self.today = now.astimezone(zone).date()

    def day(self, offset: int, hour: int, minute: int = 0) -> datetime:
        local = datetime.combine(self.today + timedelta(days=offset), time(hour, minute), self.zone)
        return local.astimezone(UTC)

    def ago(self, hours: float) -> datetime:
        return self._floor(self.now - timedelta(hours=hours))

    def start_of_today(self) -> datetime:
        return self.day(0, 0)

    def end_of_today(self) -> datetime:
        return self.day(1, 0)

    def passed_today(self) -> datetime:
        return max(self.ago(2), self.start_of_today() + timedelta(minutes=5))

    def later_today(self) -> datetime:
        target = self._floor(self.now + timedelta(hours=3))
        latest = self.end_of_today() - timedelta(minutes=15)
        return max(min(target, latest), self.now + timedelta(minutes=5))

    @staticmethod
    def _floor(moment: datetime) -> datetime:
        return moment.replace(minute=moment.minute - moment.minute % 5, second=0, microsecond=0)


def demo_leads(t: Timeline) -> list[DemoLead]:
    return [
        DemoLead(
            created_at=t.day(-9, 10, 5),
            lead=NewLead("Ananya Iyer", "Meridian Wealth Partners", "+91 98765 43210"),
            steps=[
                Note(
                    t.day(-9, 11, 30),
                    "Discovery call. 40 advisors, losing track of follow-ups in spreadsheets. "
                    "Wants a pilot for one branch.",
                ),
                StatusChange(t.day(-9, 11, 35), LeadStatus.CONTACTED),
                Note(
                    t.day(-6, 16, 0),
                    "Demo with Ananya and her ops lead. Budget approved for Q3; "
                    "she signs off on tooling.",
                ),
                StatusChange(t.day(-6, 16, 5), LeadStatus.QUALIFIED),
                Note(
                    t.day(-2, 15, 20),
                    "Sent pricing tiers PDF. She'll review with her CFO on Thursday.",
                    follow_up_at=t.day(-1, 11, 0),
                ),
                StatusChange(t.day(-2, 15, 25), LeadStatus.PROPOSAL_SENT),
            ],
        ),
        DemoLead(
            created_at=t.day(-8, 9, 40),
            lead=NewLead("Rohan Mehta", "Northstar Family Office", "+91 99300 12456"),
            steps=[
                Note(
                    t.day(-8, 9, 45),
                    "Inbound from the website. Family office with 6 relationship managers.",
                ),
                StatusChange(t.day(-7, 12, 0), LeadStatus.CONTACTED),
                Note(
                    t.day(-5, 17, 10),
                    "Left a voicemail and sent a recap email.\nAsked for a 20-minute slot "
                    "with their COO.",
                    follow_up_at=t.day(-3, 15, 0),
                ),
            ],
        ),
        DemoLead(
            created_at=t.day(-12, 14, 0),
            lead=NewLead("Priya Sharma", "Kestrel Capital", "+91 98200 55117"),
            steps=[
                StatusChange(t.day(-11, 10, 0), LeadStatus.CONTACTED),
                Note(
                    t.day(-4, 13, 30),
                    "Call with Priya. Their compliance team needs an audit trail of every "
                    "client conversation.",
                ),
                StatusChange(t.day(-4, 13, 40), LeadStatus.QUALIFIED),
                Note(
                    t.day(-1, 18, 15),
                    "Priya asked for references from two wealth firms of similar size. "
                    "Call her once they're lined up.",
                    follow_up_at=t.passed_today(),
                ),
            ],
        ),
        DemoLead(
            created_at=t.day(-6, 11, 0),
            lead=NewLead("Daniel Okafor", "Bluewater Advisors", "+44 20 7946 0958"),
            steps=[
                Note(
                    t.day(-6, 11, 20), "Met at the Wealth Tech Summit. Interested in mobile notes."
                ),
                StatusChange(t.day(-5, 9, 30), LeadStatus.CONTACTED),
                Note(
                    t.ago(1),
                    "Quick call. He is comparing us with their current CRM; wants to see "
                    "follow-up reminders in action.",
                    follow_up_at=t.later_today(),
                ),
            ],
        ),
        DemoLead(
            created_at=t.day(-10, 15, 0),
            lead=NewLead("Meera Nair", "Lotus Financial Planning", "+91 97400 88321"),
            steps=[
                StatusChange(t.day(-9, 10, 15), LeadStatus.CONTACTED),
                Note(t.day(-5, 12, 0), "Discovery call. 12 planners, all on WhatsApp today."),
                StatusChange(t.day(-2, 12, 30), LeadStatus.QUALIFIED),
                Note(
                    t.day(-2, 12, 40),
                    "Confirmed need and budget. Meera decides, but wants her senior planner "
                    "on the next call.",
                    follow_up_at=t.day(1, 10, 0),
                ),
            ],
        ),
        DemoLead(
            created_at=t.day(-3, 16, 30),
            lead=NewLead("Arjun Kapoor", "Summit Ridge Investments", "+91 98111 20304"),
            steps=[
                StatusChange(t.day(-2, 10, 0), LeadStatus.CONTACTED),
                Note(
                    t.day(-1, 14, 0),
                    "Sent the intro deck. Arjun is travelling; asked to reconnect next week.",
                    follow_up_at=t.day(7, 11, 30),
                ),
            ],
        ),
        DemoLead(
            created_at=t.day(-20, 10, 0),
            lead=NewLead("Sara Lindqvist", "Fjord Asset Management", "+46 8 123 456 78"),
            steps=[
                StatusChange(t.day(-19, 9, 0), LeadStatus.CONTACTED),
                Note(t.day(-15, 15, 0), "Discovery call. Team of 25 across Stockholm and Oslo."),
                StatusChange(t.day(-15, 15, 10), LeadStatus.QUALIFIED),
                Note(
                    t.day(-8, 11, 0),
                    "Sent the proposal with annual billing.",
                    follow_up_at=t.day(-4, 10, 0),
                ),
                StatusChange(t.day(-8, 11, 5), LeadStatus.PROPOSAL_SENT),
                Note(
                    t.day(-5, 16, 45),
                    "Signed. 25 seats on annual billing; onboarding kicks off next month.",
                ),
                StatusChange(t.day(-5, 16, 50), LeadStatus.WON),
            ],
        ),
        DemoLead(
            created_at=t.day(-18, 12, 0),
            lead=NewLead("Kabir Singh", "Banyan Tree Advisory", "+91 99876 54321"),
            steps=[
                StatusChange(t.day(-17, 10, 30), LeadStatus.CONTACTED),
                Note(t.day(-14, 14, 0), "Demo went well, but they are mid-way through a merger."),
                StatusChange(t.day(-14, 14, 5), LeadStatus.QUALIFIED),
                Note(
                    t.day(-6, 10, 20),
                    "Not moving forward. Merger froze all new tooling until next year. "
                    "Revisit in January.",
                ),
                StatusChange(t.day(-6, 10, 25), LeadStatus.LOST),
            ],
        ),
        DemoLead(
            created_at=t.day(-3, 9, 15),
            lead=NewLead("Neha Gupta", "Saffron Securities", "+91 98450 77889"),
            steps=[],
        ),
        DemoLead(
            created_at=t.day(-1, 17, 0),
            lead=NewLead("Vikram Rao"),
            steps=[
                Note(
                    t.day(-1, 17, 20),
                    "Independent advisor, referred by Meera. Manages 80 families on his own.",
                ),
            ],
        ),
    ]


async def _create_demo_lead(
    demo: DemoLead,
    clock: FixedClock,
    leads: LeadService,
    activities: ActivityService,
    zone: ZoneInfo,
) -> None:
    clock.set(demo.created_at)
    created = await leads.create_lead(demo.lead, zone)
    for step in demo.steps:
        clock.set(step.at)
        match step:
            case Note():
                await activities.log_note(created.id, NewNote(step.body, step.follow_up_at), zone)
            case StatusChange():
                await leads.update_lead(created.id, {"status": step.status}, zone)


async def seed_demo_data(session: AsyncSession, now: datetime, zone: ZoneInfo) -> int:
    clock = FixedClock(now)
    leads = LeadService(session, clock)
    activities = ActivityService(session, clock)
    demos = demo_leads(Timeline(now, zone))
    for demo in demos:
        await _create_demo_lead(demo, clock, leads, activities, zone)
    return len(demos)


async def run(reset: bool) -> None:
    settings = get_settings()
    configure_logging(settings)
    database = Database(settings)
    try:
        async with database.sessionmaker() as session:
            maintenance = MaintenanceRepository(session)
            async with session.begin():
                if reset:
                    await maintenance.truncate_all()
                    logger.info("seed.reset")
                elif await maintenance.has_leads():
                    logger.info("seed.skipped", reason="leads already exist")
                    return
            count = await seed_demo_data(session, SystemClock().now(), settings.default_zone)
            logger.info("seed.completed", leads=count, timezone=settings.default_timezone)
    finally:
        await database.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Load LeadFlow demo data.")
    parser.add_argument("--reset", action="store_true", help="delete all leads before seeding")
    arguments = parser.parse_args()
    asyncio.run(run(reset=arguments.reset))


if __name__ == "__main__":
    main()
