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
# ---- project ideas: (title, pitch, skills needed). Skills mostly come from what the demo students teach,
# so the "teammates" panel finds people. A few use skills nobody teaches, to show the empty case. ----
PROJECT_IDEAS = [
    ("Study group scheduler", "A tiny app that finds a time everyone in a study group is free. Need people who can build and design it.", ["react", "sql", "figma", "javascript"]),
    ("Campus food map", "Crowd-sourced map of cheap, good food around UBC with student reviews.", ["react", "python", "figma", "photography"]),
    ("Stats explained podcast", "Short episodes that explain first-year stats without the jargon.", ["statistics", "video editing", "public speaking"]),
    ("Chem lab notes app", "Something to log lab results and check calculations before you hand them in.", ["chemistry", "javascript", "figma"]),
    ("Language swap cafe", "A weekly meet-up where we swap Spanish, French and Japanese over coffee.", ["spanish", "french", "japanese"]),
    ("Open mic poster series", "Posters and a small site for the monthly open mic night.", ["illustration", "figma", "photography"]),
    ("Plant-watering robot", "Arduino build that waters a dorm plant. Looking for people who like hardware.", ["arduino", "3d printing", "python"]),
    ("Hiking trip planner", "Plan group hikes with carpools, gear lists and weather. Early stage.", ["react", "git", "photography"]),
    ("Budget tracker for students", "Spreadsheet-turned-app for tracking tuition, rent and groceries.", ["excel", "sql", "python"]),
    ("Climate data dashboard", "Visualize local climate data and what it means for campus.", ["r", "statistics", "python"]),
    ("Intramural stats site", "Standings and player stats for intramural leagues.", ["sql", "react", "statistics"]),
    ("Recipe zine for small kitchens", "A printed and online zine of recipes that work in a dorm kitchen.", ["cooking", "illustration", "meal prep"]),
    ("Interview prep buddies", "Mock interviews and resume swaps for co-op season.", ["interview prep", "resume review", "public speaking"]),
    ("Calculus visual guides", "Short visual explainers for tough calc ideas. Pitch is still rough.", ["calculus", "illustration", "video editing"]),
    ("Campus lost and found", "A simple board for lost items, with photos and a claim button.", ["react", "python", "figma", "sql"]),
    ("Piano and guitar jam night", "Casual jam sessions, all levels. Need a few instruments and one organizer.", ["piano", "guitar", "violin"]),
    ("Machine learning reading group", "Read one paper a week and try to reproduce a small result.", ["machine learning", "python", "latex"]),
    ("Chess club ladder", "A ladder website with ratings and match scheduling.", ["chess", "javascript", "sql"]),
    ("Sustainability audit of the Nest", "Measure waste and energy use, then suggest simple changes.", ["excel", "presentations", "statistics"]),
    ("Study snack swap", "Swap homemade snacks during exam season.", ["baking", "meal prep"]),
    ("Essay feedback circle", "Small group that reads each other's drafts before deadlines.", ["essay writing", "study techniques", "public speaking"]),
    ("Dorm yoga mornings", "Twenty-minute stretch sessions before 9 am classes.", ["yoga", "running"]),
]


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
    major_of = {}
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
        major_of[user.email] = major
    # Coverage: make sure every teachable skill that a project asks for is taught by someone, otherwise the
    # teammates panel is empty almost everywhere. Skills no major teaches (photography, cooking) stay empty on purpose.
    taught = {t for u in users for t in _terms(u.skills_teach)}
    for _, _, skills in PROJECT_IDEAS:
        for skill in skills:
            if skill in taught:
                continue
            candidates = [u for u in users if skill in MAJORS[major_of[u.email]]["teach"]]
            if candidates:
                owner = rng.choice(candidates)
                owner.skills_teach = f"{owner.skills_teach}, {skill}"
                taught.add(skill)
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
    # Return likes: when someone likes a person they have not been judged by yet, that person often likes back.
    # Good fits (one teaches what the other wants) return the like most of the time, others now and then.
    db.flush()  # autoflush is off, so write the swipes above before reading them back
    by_id = {u.id: u for u in users}
    decided = {(row.swiper_id, row.target_id) for row in db.query(models.Swipe).filter(models.Swipe.kind == "skill", models.Swipe.swiper_id.in_(ids))}
    for swiper_id, target_id in sorted(liked["skill"]):
        if (target_id, swiper_id) in decided:
            continue
        a, b = by_id[swiper_id], by_id[target_id]
        fit = bool(_terms(b.skills_teach) & _terms(a.skills_learn)) or bool(_terms(a.skills_teach) & _terms(b.skills_learn))
        if rng.random() < (0.6 if fit else 0.2):
            db.add(models.Swipe(swiper_id=target_id, target_id=swiper_id, kind="skill", direction="like"))
            decided.add((target_id, swiper_id))
            liked["skill"].add((target_id, swiper_id))
            counts["skill"][0] += 1
    db.commit()
    mutual = {kind: sorted({tuple(sorted(p)) for p in liked[kind] if (p[1], p[0]) in liked[kind]}) for kind in liked}
    total_pairs = len(users) * (len(users) - 1)
    summary = {kind: dict(likes=counts[kind][0], passes=counts[kind][1], mutual=len(mutual[kind]),
                          untouched=round(100 * (1 - sum(counts[kind]) / total_pairs))) for kind in counts}
    return mutual["skill"], summary


def make_exchanges_and_reviews(rng, db, models, users, pairs):
    """Lessons for mutually matched pairs: most completed and rated, some only scheduled, some with no lesson.

    Each student gets a hidden "how good a teacher" level, so ratings differ from person to person
    (roughly 3.0 to 5.0) and the rating sort and minimum-rating filter have something to do.
    Many students end up with no reviews at all, which shows the "no reviews yet" case (never a zero).
    """
    ids = [u.id for u in users]
    old = db.query(models.SkillExchange).filter(models.SkillExchange.participant_low_id.in_(ids), models.SkillExchange.participant_high_id.in_(ids)).all()
    for ex in old:  # only exchanges between two demo students; real users' lessons are untouched
        db.query(models.SkillReview).filter_by(exchange_id=ex.id).delete(synchronize_session=False)
        db.delete(ex)
    db.flush()

    quality = {u.id: rng.uniform(3.0, 5.0) for u in users}
    score = lambda who: max(1, min(5, round(rng.gauss(quality[who], 0.5))))
    now = datetime.now(timezone.utc)
    pairs = list(pairs)
    rng.shuffle(pairs)
    n_done, n_sched = round(len(pairs) * 0.65), round(len(pairs) * 0.2)
    for i, (low, high) in enumerate(pairs):
        if i < n_done:        # completed lesson, both sides confirmed and rated
            when = now - timedelta(days=rng.randint(1, 25))
            ex = models.SkillExchange(participant_low_id=low, participant_high_id=high, created_by_id=rng.choice([low, high]),
                                      scheduled_for=when, low_completed_at=when + timedelta(hours=2),
                                      high_completed_at=when + timedelta(hours=3))
            db.add(ex)
            db.flush()
            for reviewer, reviewee in ((low, high), (high, low)):
                if rng.random() < 0.9:  # now and then someone has not rated yet
                    db.add(models.SkillReview(exchange_id=ex.id, reviewer_id=reviewer, reviewee_id=reviewee,
                                              learned=score(reviewee), taught=score(reviewee), collaboration=score(reviewee)))
        elif i < n_done + n_sched:  # scheduled for later, nobody has confirmed
            db.add(models.SkillExchange(participant_low_id=low, participant_high_id=high, created_by_id=rng.choice([low, high]),
                                        scheduled_for=now + timedelta(days=rng.randint(1, 10), hours=rng.randint(0, 8))))
        # the rest stay matches with no lesson yet
    db.commit()
    return n_done, n_sched, len(pairs) - n_done - n_sched


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


def make_projects(rng, db, models, users, count=18):
    """Student projects looking for teammates, posted by varied owners over the last two weeks.

    Every project has a different owner. A couple have no pitch, and a few need a skill nobody
    teaches, so the teammates panel also shows its empty case.
    """
    for old in db.query(models.Project).filter(models.Project.owner_id.in_([u.id for u in users])).all():
        db.delete(old)
    db.flush()
    now = datetime.utcnow()
    ideas = rng.sample(PROJECT_IDEAS, k=min(count, len(PROJECT_IDEAS)))
    owners = rng.sample(users, k=min(len(ideas), len(users)))
    for i, (title, pitch, skills) in enumerate(ideas):
        owner = owners[i % len(owners)]
        needed = skills[: rng.randint(max(1, len(skills) - 1), len(skills))]
        db.add(models.Project(owner_id=owner.id, title=title, pitch="" if i % 9 == 4 else pitch,
                              skills_needed=",".join(needed),
                              created_at=now - timedelta(hours=rng.randint(1, 14 * 24))))
    db.commit()
    return len(ideas)


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
    now = datetime.now(timezone.utc)
    # Lesson 1: yesterday, the demo student already confirmed. You confirm it, then rate it.
    # Lesson 2: tomorrow, so the "upcoming" state has something to show.
    for user, when, they_confirmed in ((users[0], now - timedelta(days=1), True), (users[1], now + timedelta(days=1), False)):
        low, high = sorted((me.id, user.id))
        ex = db.query(models.SkillExchange).filter_by(participant_low_id=low, participant_high_id=high).first()
        if not ex:
            ex = models.SkillExchange(participant_low_id=low, participant_high_id=high, created_by_id=user.id, scheduled_for=when)
            db.add(ex)
        ex.scheduled_for, ex.low_completed_at, ex.high_completed_at = when, None, None
        if they_confirmed:
            if user.id == low:
                ex.low_completed_at = when + timedelta(hours=2)
            else:
                ex.high_completed_at = when + timedelta(hours=2)
    db.commit()
    print(f"6 demo students now like {me.email} in both decks: like them back to see a match.")
    print(f"2 lessons with you: one with {users[0].name} for you to confirm and rate, one with {users[1].name} tomorrow.")


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
    db.query(models.Project).filter(models.Project.owner_id.in_(ids)).delete(synchronize_session=False)
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
    parser.add_argument("--only", choices=["users", "swipes", "lessons", "listings", "projects", "presence"], help="stop after creating the students")
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
        if args.only == "lessons":
            pairs, _ = make_swipes(rng, db, models, users)
            done, upcoming, none = make_exchanges_and_reviews(rng, db, models, users, pairs)
            print(f"Lessons:    {done} completed (with ratings), {upcoming} scheduled, {none} matches with no lesson yet")
            return
        if args.only == "listings":
            n = make_listings(rng, db, models, users)
            print(f"Listings:   {n}")
            return
        if args.only == "projects":
            print(f"Projects:   {make_projects(rng, db, models, users)}")
            return
        if args.only == "presence":
            report_presence(make_presence(rng, db, models, users))
            return
        pairs, summary = make_swipes(rng, db, models, users)
        report_swipes(summary)
        done, upcoming, none = make_exchanges_and_reviews(rng, db, models, users, pairs)
        print(f"Lessons:    {done} completed (with ratings), {upcoming} scheduled, {none} matches with no lesson yet")
        print(f"Listings:   {make_listings(rng, db, models, users)}")
        print(f"Projects:   {make_projects(rng, db, models, users)}")
        report_presence(make_presence(rng, db, models, users))
        if args.like_back:
            like_back(db, models, users, args.like_back)
    finally:
        db.close()


if __name__ == "__main__":
    main()
