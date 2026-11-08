"""Add clearly labelled demo students so the Buddies / SkillShare decks have cards.

Usage (from backend/, with the venv active):
    python seed_demo.py                              # add/refresh demo students
    python seed_demo.py --like-back you@student.ubc.ca
        # demo students also "like" that account in both decks, so liking them shows a match
    python seed_demo.py --remove                     # delete demo students and their swipes

Demo accounts use @demo.ubcver.invalid addresses, so they can never sign in, and every
bio says "Demo profile". They are sample data, not real students.
"""
import argparse

from app import models
from app.database import Base, SessionLocal, engine
import app.main  # noqa: F401  (runs table creation / column upgrades)

DOMAIN = "@demo.ubcver.invalid"
DEMO = [
    ("Maya Chen", "CPSC 213, MATH 200", "bouldering, board games, matcha", "python, figma", "guitar, spanish", "in_person", "medium"),
    ("Jordan Okafor", "CPSC 213, CPSC 330", "basketball, hackathons", "react, javascript", "python, machine learning", "either", "high"),
    ("Priya Natarajan", "BIOL 112, CHEM 121", "hiking, photography", "spanish, chemistry", "python", "in_person", "low"),
    ("Leo Martins", "CPSC 330, DSCI 100", "anime, chess, running", "machine learning, sql", "piano", "online", "medium"),
    ("Hana Sato", "MATH 200, PHYS 117", "piano, baking, k-pop", "piano, calculus", "react, drawing", "either", "low"),
    ("Sam Rivera", "DSCI 100, STAT 200", "soccer, podcasts", "r, statistics", "guitar", "in_person", "high"),
    ("Aisha Rahman", "CPSC 213, BIOL 112", "volunteering, cooking, hiking", "drawing, illustration", "javascript", "either", "medium"),
    ("Noah Kim", "CPSC 330, MATH 200", "video games, gym", "guitar, video editing", "machine learning", "online", "high"),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--like-back", metavar="EMAIL")
    parser.add_argument("--remove", action="store_true")
    args = parser.parse_args()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        demo_users = db.query(models.User).filter(models.User.email.like(f"%{DOMAIN}")).all()
        if args.remove:
            ids = [u.id for u in demo_users]
            db.query(models.Swipe).filter((models.Swipe.swiper_id.in_(ids)) | (models.Swipe.target_id.in_(ids))).delete(synchronize_session=False)
            for u in demo_users:
                db.delete(u)
            db.commit()
            print(f"Removed {len(ids)} demo students.")
            return
        by_email = {u.email: u for u in demo_users}
        for name, courses, interests, teach, learn, mode, energy in DEMO:
            email = name.lower().replace(" ", ".") + DOMAIN
            user = by_email.get(email) or models.User(email=email, name=name)
            user.bio = "Demo profile · sample data, not a real student"
            user.courses, user.interests, user.skills_teach, user.skills_learn = courses, interests, teach, learn
            user.mode, user.energy = mode, energy
            db.add(user)
            by_email[email] = user
        db.commit()
        print(f"{len(DEMO)} demo students ready.")
        if args.like_back:
            me = db.query(models.User).filter_by(email=args.like_back.lower()).first()
            if not me:
                print(f"No profile for {args.like_back} yet: sign in and create your profile first, then rerun.")
                return
            for user in by_email.values():
                for kind in ("buddy", "skill"):
                    row = db.query(models.Swipe).filter_by(swiper_id=user.id, target_id=me.id, kind=kind).first()
                    if row:
                        row.direction = "like"
                    else:
                        db.add(models.Swipe(swiper_id=user.id, target_id=me.id, kind=kind, direction="like"))
            db.commit()
            print(f"Demo students now like {me.email} in both decks: liking one back shows a match.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
