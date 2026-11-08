"""Generate clearly labelled fake data so every page has something to show.

Run from backend/ with the venv active:

    python generate_data.py                       # writes to a throwaway local.db (SQLite)
    python generate_data.py --students 40         # more people
    python generate_data.py --like-back you@student.ubc.ca
                                                  # some people also like YOUR real account
    python generate_data.py --remove              # delete everything this script made
    python generate_data.py --target remote --allow-remote
                                                  # write to the DATABASE_URL in .env (Tiger!)

Safety rules
- Default target is local.db. The .env DATABASE_URL is ignored unless you pass BOTH
  --target remote and --allow-remote.
- Every fake student uses an @demo.ubcver.invalid address, so none can ever sign in,
  and every bio says "Demo profile". --remove only touches those accounts.
- The same --seed always produces the same data, so re-running is safe (it refreshes).
"""
import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

DOMAIN = "@demo.ubcver.invalid"
CAMPUS = (49.2606, -123.2460)  # UBC Vancouver, centre of the heatmap points

FIRST = [
    "Maya", "Jordan", "Priya", "Leo", "Hana", "Sam", "Aisha", "Noah", "Chloe", "Arjun", "Mei", "Omar",
    "Sofia", "Kai", "Zara", "Ethan", "Lina", "Diego", "Nora", "Ravi", "Tessa", "Yuki", "Amir", "Ivy",
    "Mateo", "Fatima", "Wei", "Isabelle", "Tariq", "Anika", "Lucas", "Jasmine", "Dmitri", "Camila",
    "Seung", "Olivia", "Kwame", "Elena", "Harpreet", "Naomi", "Andre", "Sana", "Felix", "Thanh",
]
LAST = [
    "Chen", "Okafor", "Natarajan", "Martins", "Sato", "Rivera", "Rahman", "Kim", "Singh", "Nguyen",
    "Tremblay", "Haddad", "Rossi", "Wong", "Ibrahim", "Larsen", "Patel", "Mendez", "Park", "Cohen",
    "Dhillon", "Moreau", "Abara", "Lin", "Kowalski", "Fernandes", "Zhang", "Sandhu", "Bergstrom", "Osei",
    "Yamamoto", "Hosseini", "O'Brien", "Gill", "Castillo", "Mukherjee", "Lee", "Dubois", "Adeyemi", "Suzuki",
]
# Each "major" bundles courses, what people there can teach, and what they tend to want to learn,
# so profiles feel like real students instead of random mixes.
MAJORS = {
    "Computer Science": dict(courses=["CPSC 110", "CPSC 121", "CPSC 213", "CPSC 221", "CPSC 330", "MATH 200", "STAT 200"],
                             teach=["python", "java", "react", "git", "sql", "javascript"],
                             learn=["figma", "public speaking", "guitar", "photography", "french", "drawing"],
                             interests=["hackathons", "video games", "anime", "board games", "bouldering", "coffee shops"]),
    "Data Science": dict(courses=["DSCI 100", "STAT 200", "MATH 221", "CPSC 330", "ECON 101"],
                         teach=["r", "statistics", "python", "excel", "sql", "machine learning"],
                         learn=["public speaking", "essay writing", "spanish", "piano", "figma"],
                         interests=["podcasts", "running", "chess", "board games", "cycling"]),
    "Biology": dict(courses=["BIOL 111", "BIOL 112", "BIOL 121", "CHEM 121", "CHEM 123", "MATH 100"],
                    teach=["organic chemistry", "chemistry", "lab notes", "meal prep", "yoga"],
                    learn=["python", "excel", "statistics", "photography", "guitar"],
                    interests=["hiking", "kayaking", "gardening", "volunteering", "yoga", "baking"]),
    "Commerce": dict(courses=["COMM 101", "COMM 151", "ECON 101", "ECON 102", "MATH 101", "STAT 200"],
                     teach=["excel", "interview prep", "resume review", "public speaking", "presentations"],
                     learn=["python", "sql", "figma", "spanish", "mandarin"],
                     interests=["basketball", "coffee shops", "thrifting", "gym", "karaoke", "tennis"]),
    "Psychology": dict(courses=["PSYC 101", "PSYC 102", "STAT 200", "SOCI 100", "ENGL 110"],
                       teach=["essay writing", "study techniques", "statistics", "yoga", "knitting"],
                       learn=["r", "python", "guitar", "drawing", "cooking"],
                       interests=["book club", "podcasts", "pottery", "volunteering", "film photography", "sketching"]),
    "Arts": dict(courses=["ENGL 112", "HIST 101", "POLI 100", "ARTH 100", "PHIL 120", "LING 100"],
                 teach=["essay writing", "french", "spanish", "japanese", "drawing", "illustration"],
                 learn=["excel", "python", "video editing", "public speaking", "photography"],
                 interests=["open mic nights", "sketching", "thrifting", "book club", "karaoke", "film photography"]),
    "Engineering": dict(courses=["APSC 100", "APSC 160", "MATH 100", "MATH 200", "PHYS 131", "CHEM 123"],
                        teach=["arduino", "3d printing", "calculus", "linear algebra", "latex", "python"],
                        learn=["public speaking", "essay writing", "cooking", "guitar", "figma"],
                        interests=["cycling", "skiing", "badminton", "video games", "ultimate frisbee", "gym"]),
    "Kinesiology": dict(courses=["KIN 100", "BIOL 111", "PSYC 101", "FNH 150", "STAT 200"],
                        teach=["running", "swimming", "meal prep", "yoga", "weight training"],
                        learn=["excel", "r", "video editing", "spanish", "piano"],
                        interests=["running", "soccer", "gym", "hiking", "skiing", "dance"]),
    "Music and Design": dict(courses=["MUSC 100", "ARTH 100", "ENGL 110", "PSYC 101"],
                             teach=["guitar", "piano", "violin", "figma", "illustration", "video editing"],
                             learn=["python", "react", "public speaking", "excel", "baking"],
                             interests=["open mic nights", "pottery", "film photography", "karaoke", "dance", "coffee shops"]),
    "Physics and Math": dict(courses=["PHYS 117", "PHYS 131", "MATH 200", "MATH 221", "ASTR 101", "CPSC 110"],
                             teach=["calculus", "linear algebra", "latex", "python", "chess"],
                             learn=["guitar", "cooking", "public speaking", "photography", "mandarin"],
                             interests=["chess", "board games", "hiking", "astronomy nights", "running", "bouldering"]),
}
YEARS = ["1st-year", "2nd-year", "3rd-year", "4th-year", "exchange", "grad"]
# Casual openers. Each bio is "Demo profile" + year/major + one of these, so it is always labelled.
BIO_LINES = [
    "always down for a study session.", "learn best by teaching, so ask me anything.", "new here and looking for friends.",
    "coffee-powered. Library regular.", "happy to swap skills, I'm no expert at any of it.", "night owl, focus kicks in after 8.",
    "prefer small groups.", "transferred in this year, still finding my spots.", "midterms are coming, send help.",
    "weekend hikes are the reset button.", "trying to be less nervous about group work.", "love explaining stuff over food.",
]
MODES = ["in_person", "online", "either"]
ENERGIES = ["low", "medium", "high"]
# ---- listing building blocks (study / skill) ----
STUDY_TITLES = ["{t} midterm study group", "{t} problem set night", "{t} lab review", "{t} exam cram", "Weekly {t} homework help",
                "{t} past papers session", "{t} study buddies wanted", "Quiet {t} study block"]
STUDY_DESCRIPTIONS = ["Going through past midterms together.", "Bring the questions you're stuck on.", "We'll work through the problem set and compare answers.",
                      "Casual, no pressure. Just trying to stay on top of the material.", "I have the lecture notes, bring snacks.",
                      "Aiming to finish the assignment before the deadline, not the night of.", "Small group, all levels welcome."]
STUDY_PLACES = ["Irving K. Barber Learning Centre", "Koerner Library", "Life Sciences Centre", "Math Annex", "Nest, 2nd floor", "Woodward Library",
                "ICICS building", "Chapman Learning Commons", "Buchanan courtyard", "Fred Kaiser building"]
SKILL_TITLES = ["{s} for beginners", "Swap {s} for {l}", "Learn {s} with me", "{s} practice hour", "Quick {s} crash course", "{s} basics over coffee"]
SKILL_DESCRIPTIONS = ["Happy to swap an hour each.", "No experience needed, I'll go slow.", "Bring a laptop or just curiosity.",
                      "I've done this for a few years and like explaining it.", "Casual, we can adjust to whatever you want to learn.",
                      "Looking for someone patient to trade skills with."]
SKILL_PLACES = ["Nest lounge", "Online (Zoom)", "Starbucks at the Nest", "Rose Garden", "AMS Student Nest, top floor", "Ponderosa Commons",
                "Online (Discord)", "Barn Coffee", "Totem Park common room"]
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
TIME_STYLES = ["{d} {h}", "{d} after class", "This {d} at {h}", "Tomorrow {h}", "{d} {h}\u2013{h2}", "{d} evening", "Weekends {h}"]
HOURS = ["10am", "11am", "12:30pm", "2pm", "3:30pm", "5pm", "6pm", "7:30pm"]


def make_time(rng):
    i = rng.randrange(len(HOURS) - 1)
    j = rng.randrange(i + 1, len(HOURS))  # end time is always after the start time
    return rng.choice(TIME_STYLES).format(d=rng.choice(DAYS), h=HOURS[i], h2=HOURS[j])


def first_of(text, rng):
    parts = [p.strip() for p in text.split(",") if p.strip()]
    return rng.choice(parts) if parts else "general"


def choose_target(args):
    """Decide the database BEFORE app.database is imported, so .env cannot override it."""
    if args.target == "local":
        os.environ["DATABASE_URL"] = "sqlite:///./local.db"
        print("Target: local.db (SQLite, safe to throw away)")
        return
    if not args.allow_remote:
        sys.exit("Refusing: --target remote also needs --allow-remote (this writes to the shared database).")
    from dotenv import load_dotenv
    load_dotenv()
    url = os.getenv("DATABASE_URL", "")
    if not url:
        sys.exit("No DATABASE_URL in .env, nothing to write to.")
    host = urlparse(url).hostname or "unknown host"  # never print the password
    print(f"Target: REMOTE database at {host}")


def make_students(rng, db, models, count):
    """Create or refresh demo students. Each one belongs to a major, so courses, skills and interests agree."""
    names = [f"{f} {l}" for f in FIRST for l in LAST]
    rng.shuffle(names)
    majors = list(MAJORS)
    # Spread these evenly (then shuffle) so a small group still has every kind of person.
    modes = [MODES[i % 3] for i in range(count)]
    energies = [ENERGIES[i % 3] for i in range(count)]
    rng.shuffle(modes)
    rng.shuffle(energies)
    # XP: a few newcomers, a big middle, a few veterans.
    xps = [rng.choice([0, 0, 10, 25, 40]) if i % 10 < 2 else rng.randint(60, 400) if i % 10 < 8 else rng.randint(500, 1500)
           for i in range(count)]
    rng.shuffle(xps)
    users = []
    for i, name in enumerate(names[:count]):
        email = name.lower().replace(" ", ".") + DOMAIN
        major = majors[i % len(majors)]  # round-robin so every major shows up
        m = MAJORS[major]
        user = db.query(models.User).filter_by(email=email).first() or models.User(email=email, name=name)
        user.bio = f"Demo profile · {rng.choice(YEARS)} {major}, {rng.choice(BIO_LINES)}"
        user.courses = ", ".join(rng.sample(m["courses"], rng.randint(2, 3)))
        user.skills_teach = ", ".join(rng.sample(m["teach"], rng.randint(1, 2)))
        user.skills_learn = ", ".join(rng.sample(m["learn"], rng.randint(1, 3)))
        user.interests = ", ".join(rng.sample(m["interests"], rng.randint(2, 3)))
        user.mode = modes[i]
        user.energy = energies[i]
        user.xp = xps[i]
        # photo and sticker are deliberately left empty
        db.add(user)
        users.append(user)
    db.commit()
    return users


def _terms(text):
    return {t.strip().lower() for t in text.split(",") if t.strip()}


def make_swipes(rng, db, models, users):
    """Likes and passes in both decks, with plenty left undecided so there is room to explore.

    - Each student has a swiping style: how many people they judged (a few, some, many) and how
      generous they are (picky, average, generous). So the data has quiet people and busy ones.
    - Likes lean toward good fits: in the skill deck, "I can teach what you want to learn";
      in the buddy deck, shared interests. Not everyone likes a good fit, and some like at random.
    - Only a fraction of all possible pairs are decided, so decks are never empty for a new account.
    Returns (mutual skill pairs, summary counts).
    """
    ids = [u.id for u in users]
    db.query(models.Swipe).filter(models.Swipe.swiper_id.in_(ids), models.Swipe.target_id.in_(ids)).delete(synchronize_session=False)
    liked = {"buddy": set(), "skill": set()}
    counts = {"buddy": [0, 0], "skill": [0, 0]}  # [likes, passes]
    reach = {"a few": (2, 5), "some": (6, 11), "many": (12, 20)}
    generosity = {"picky": 0.25, "average": 0.5, "generous": 0.75}
    for kind in ("buddy", "skill"):
        for me in users:
            style = rng.choices(list(reach), weights=[3, 4, 2])[0]
            base = generosity[rng.choice(list(generosity))]
            low, high = reach[style]
            for other in rng.sample([u for u in users if u is not me], k=min(rng.randint(low, high), len(users) - 1)):
                if kind == "skill":
                    fit = bool(_terms(other.skills_teach) & _terms(me.skills_learn)) or bool(_terms(me.skills_teach) & _terms(other.skills_learn))
                else:
                    fit = len(_terms(other.interests) & _terms(me.interests)) > 0 or other.mode == me.mode
                chance = min(0.95, base + (0.25 if fit else -0.1))
                like = rng.random() < chance
                db.add(models.Swipe(swiper_id=me.id, target_id=other.id, kind=kind, direction="like" if like else "pass"))
                counts[kind][0 if like else 1] += 1
                if like:
                    liked[kind].add((me.id, other.id))
    db.commit()
    mutual = {kind: sorted({tuple(sorted(p)) for p in liked[kind] if (p[1], p[0]) in liked[kind]}) for kind in liked}
    total_pairs = len(users) * (len(users) - 1)
    summary = {kind: dict(likes=counts[kind][0], passes=counts[kind][1], mutual=len(mutual[kind]),
                          untouched=round(100 * (1 - sum(counts[kind]) / total_pairs))) for kind in counts}
    return mutual["skill"], summary


def make_exchanges_and_reviews(rng, db, models, pairs):
    """Lessons for some matches. Done ones get ratings from both sides."""
    now = datetime.now(timezone.utc)
    done = upcoming = 0
    for low, high in pairs:
        if db.query(models.SkillExchange).filter_by(participant_low_id=low, participant_high_id=high).first():
            continue
        roll = rng.random()
        if roll < 0.4:      # completed lesson, both sides confirmed
            when = now - timedelta(days=rng.randint(1, 20))
            ex = models.SkillExchange(participant_low_id=low, participant_high_id=high, created_by_id=low,
                                      scheduled_for=when, low_completed_at=when + timedelta(hours=2),
                                      high_completed_at=when + timedelta(hours=3))
            db.add(ex)
            db.flush()
            for reviewer, reviewee in ((low, high), (high, low)):
                db.add(models.SkillReview(exchange_id=ex.id, reviewer_id=reviewer, reviewee_id=reviewee,
                                          learned=rng.randint(3, 5), taught=rng.randint(3, 5),
                                          collaboration=rng.randint(3, 5)))
            done += 1
        elif roll < 0.7:    # scheduled for later, nobody has confirmed
            db.add(models.SkillExchange(participant_low_id=low, participant_high_id=high, created_by_id=high,
                                        scheduled_for=now + timedelta(days=rng.randint(1, 10))))
            upcoming += 1
        # the rest stay matches with no lesson yet, so "average: null" cases exist too
    db.commit()
    return done, upcoming


def make_listings(rng, db, models, users, count=36):
    """Study and skill listings with varied owners, sizes, times and how full they are.

    The owner is always the first member (that is how the real app creates a listing), and a
    listing never has more members than its capacity.
    """
    # Remove earlier demo listings through the ORM so their member links go too.
    for old in db.query(models.Listing).filter(models.Listing.owner_id.in_([u.id for u in users])).all():
        old.members = []
        db.delete(old)
    db.flush()

    now = datetime.utcnow()
    categories = ["study", "skill"]  # rides are not built yet
    for i in range(count):
        category = categories[i % 2]
        owner = rng.choice(users)
        if category == "study":
            tag = first_of(owner.courses, rng)
            title = rng.choice(STUDY_TITLES).format(t=tag)
            description, location = rng.choice(STUDY_DESCRIPTIONS), rng.choice(STUDY_PLACES)
            capacity = rng.randint(3, 8)
        elif category == "skill":
            tag = first_of(owner.skills_teach, rng)
            want = first_of(owner.skills_learn, rng)
            title = rng.choice(SKILL_TITLES).format(s=tag, l=want)
            description, location = rng.choice(SKILL_DESCRIPTIONS), rng.choice(SKILL_PLACES)
            capacity = rng.randint(2, 6)

        # How full: a few empty (owner only), many partly filled, some full.
        roll = rng.random()
        wanted = 1 if roll < 0.2 else capacity if roll > 0.85 else rng.randint(2, max(2, capacity - 1))
        wanted = min(wanted, capacity, len(users))
        others = rng.sample([u for u in users if u is not owner], k=wanted - 1)

        db.add(models.Listing(
            category=category, title=title, description=description, tag=tag, location=location,
            time=make_time(rng), capacity=capacity, owner_id=owner.id, members=[owner] + others,
            created_at=now - timedelta(hours=rng.randint(1, 14 * 24)),
        ))
    db.commit()
    return count


# Approximate UBC hotspots: (name, lat, lng, how many people gather, spread in degrees, ~20-30 m).
HOTSPOTS = [
    ("The Nest", 49.2663, -123.2494, 7, 0.00018),
    ("Irving K. Barber library", 49.2675, -123.2527, 6, 0.00018),
    ("Totem Park residence", 49.2593, -123.2555, 3, 0.00022),
    ("Sports fields", 49.2548, -123.2445, 3, 0.00025),
    ("Rose Garden", 49.2639, -123.2575, 2, 0.00015),
]


def make_presence(rng, db, models, users, share=0.8):
    """Live location points: a few tight clumps, some scattered outliers, and not everyone shares.

    The server only returns coarse cells (about 90 m by 110 m), so a clump shows up as a hot
    cell and an outlier as a lone dot. Rows older than PRESENCE_TTL_SECONDS (3 min) are pruned
    by the server, so rerun this just before a demo.
    """
    sharing = rng.sample(users, k=round(len(users) * share))
    # Split who goes where: most people sit in clumps, the rest are outliers.
    clumped = sum(spot[3] for spot in HOTSPOTS)
    outliers = max(2, len(sharing) - clumped)
    placed = []  # (user, lat, lng, label)
    pool = list(sharing)
    for name, lat, lng, size, spread in HOTSPOTS:
        for _ in range(min(size, len(pool))):
            placed.append((pool.pop(), rng.gauss(lat, spread), rng.gauss(lng, spread * 1.4), name))
    for user in pool[:outliers]:  # scattered anywhere around the wider campus
        placed.append((user, rng.uniform(49.2500, 49.2720), rng.uniform(-123.2650, -123.2300), "outlier"))
    now = datetime.utcnow()
    db.query(models.Presence).filter(models.Presence.user_id.in_([u.id for u in users])).delete(synchronize_session=False)
    for user, lat, lng, _ in placed:
        db.add(models.Presence(user_id=user.id, lat=lat, lng=lng, updated_at=now))
    db.commit()
    return placed


def report_swipes(summary):
    for kind, v in summary.items():
        print(f"Swipes {kind:5s}: {v['likes']} likes, {v['passes']} passes, {v['mutual']} mutual matches, "
              f"{v['untouched']}% of pairs still undecided")


def report_presence(placed):
    from collections import Counter
    from app.privacy import aggregate_heat_points
    cells = aggregate_heat_points([(lat, lng) for _, lat, lng, _ in placed])
    where = Counter(label for *_, label in placed)
    print(f"Heatmap:    {len(placed)} people sharing, {len(cells)} map cells, busiest cell {max(c['count'] for c in cells)} "
          f"(points expire after 3 min)")
    print("            " + ", ".join(f"{k}: {v}" for k, v in where.items()))


def like_back(db, models, users, email):
    me = db.query(models.User).filter_by(email=email.lower()).first()
    if not me:
        print(f"No profile for {email} yet. Sign in and create your profile first, then rerun.")
        return
    for user in users[:6]:
        for kind in ("buddy", "skill"):
            row = db.query(models.Swipe).filter_by(swiper_id=user.id, target_id=me.id, kind=kind).first()
            if row:
                row.direction = "like"
            else:
                db.add(models.Swipe(swiper_id=user.id, target_id=me.id, kind=kind, direction="like"))
    db.commit()
    print(f"6 demo students now like {me.email} in both decks: like them back to see a match.")


def remove_all(db, models):
    ids = [u.id for u in db.query(models.User).filter(models.User.email.like(f"%{DOMAIN}")).all()]
    if not ids:
        print("No demo students found.")
        return
    exchange_ids = [e.id for e in db.query(models.SkillExchange).filter(
        models.SkillExchange.participant_low_id.in_(ids) | models.SkillExchange.participant_high_id.in_(ids)).all()]
    # Children first, so foreign keys never block the delete.
    db.query(models.SkillReview).filter(models.SkillReview.exchange_id.in_(exchange_ids)).delete(synchronize_session=False)
    db.query(models.SkillReview).filter(models.SkillReview.reviewer_id.in_(ids) | models.SkillReview.reviewee_id.in_(ids)).delete(synchronize_session=False)
    db.query(models.SkillExchange).filter(models.SkillExchange.id.in_(exchange_ids)).delete(synchronize_session=False)
    db.query(models.Swipe).filter(models.Swipe.swiper_id.in_(ids) | models.Swipe.target_id.in_(ids)).delete(synchronize_session=False)
    db.query(models.Presence).filter(models.Presence.user_id.in_(ids)).delete(synchronize_session=False)
    for listing in db.query(models.Listing).filter(models.Listing.owner_id.in_(ids)).all():
        listing.members = []
        db.delete(listing)
    for user in db.query(models.User).filter(models.User.id.in_(ids)).all():
        db.delete(user)
    db.commit()
    print(f"Removed {len(ids)} demo students and everything attached to them.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--students", type=int, default=30, help="how many fake students (max %d)" % (len(FIRST) * len(LAST)))
    parser.add_argument("--seed", type=int, default=1, help="same seed, same data")
    parser.add_argument("--like-back", metavar="EMAIL", help="make 6 demo students like this real account")
    parser.add_argument("--only", choices=["users", "swipes", "listings", "presence"], help="stop after creating the students")
    parser.add_argument("--remove", action="store_true", help="delete all demo data")
    parser.add_argument("--target", choices=["local", "remote"], default="local")
    parser.add_argument("--allow-remote", action="store_true", help="required with --target remote")
    args = parser.parse_args()

    choose_target(args)
    # Imported only now, after DATABASE_URL has been decided.
    from app import models
    from app.database import Base, SessionLocal, engine
    import app.main  # noqa: F401  (creates tables, adds missing user columns)

    Base.metadata.create_all(bind=engine)
    rng = random.Random(args.seed)
    db = SessionLocal()
    try:
        if args.remove:
            remove_all(db, models)
            return
        users = make_students(rng, db, models, max(2, args.students))
        print(f"Students:   {len(users)}")
        if args.only == "users":
            return
        if args.only == "swipes":
            _, summary = make_swipes(rng, db, models, users)
            report_swipes(summary)
            return
        if args.only == "listings":
            n = make_listings(rng, db, models, users)
            print(f"Listings:   {n}")
            return
        if args.only == "presence":
            report_presence(make_presence(rng, db, models, users))
            return
        pairs, summary = make_swipes(rng, db, models, users)
        report_swipes(summary)
        done, upcoming = make_exchanges_and_reviews(rng, db, models, pairs)
        print(f"Lessons:    {done} completed with ratings, {upcoming} scheduled")
        print(f"Listings:   {make_listings(rng, db, models, users)}")
        report_presence(make_presence(rng, db, models, users))
        if args.like_back:
            like_back(db, models, users, args.like_back)
    finally:
        db.close()


if __name__ == "__main__":
    main()
