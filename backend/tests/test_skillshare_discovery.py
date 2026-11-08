import os
import tempfile
from datetime import datetime, timedelta, timezone
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(tempfile.mkdtemp(), 'discovery-ratings.db')
import pytest
from fastapi import FastAPI, Header
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from app import auth, models
from app.database import Base, get_db
from app.main import app as shared_app, create_profile
from app.skillshare import router as discovery_router
from app.swipe import router as swipe_router

app = FastAPI()
app.include_router(swipe_router)
app.include_router(discovery_router)
app.post('/users')(create_profile)


def current_email(x_test_verified_email: str = Header(default='test@student.ubc.ca', alias='X-Test-Verified-Email')):
    return x_test_verified_email


@pytest.fixture(scope='module', autouse=True)
def isolated_database():
    engine = create_engine('sqlite:///' + os.path.join(tempfile.mkdtemp(), 'isolated-discovery.db'), connect_args={'check_same_thread': False})
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    def test_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = test_db
    app.dependency_overrides[auth.current_email] = current_email
    yield engine
    app.dependency_overrides.clear()
    engine.dispose()


def api(email):
    return TestClient(app, headers={'X-Test-Verified-Email': email})


def make(email, name, teach, learn, mode='either'):
    client = api(email)
    response = client.post('/users', json={'name': name, 'skills_teach': teach, 'skills_learn': learn, 'mode': mode})
    assert response.status_code == 200, response.text
    return client, response.json()['id']


def like(first, second, first_id, second_id):
    for client, target in ((first, second_id), (second, first_id)):
        response = client.post('/swipe', json={'target_id': target, 'kind': 'skill', 'direction': 'like'})
        assert response.status_code == 200, response.text


@pytest.fixture(scope='module', autouse=True)
def users():
    global learner, tutor, other, tutor_id, learner_id, other_id
    learner, learner_id = make('disc-learner@student.ubc.ca', 'Learner', 'Python', 'Guitar, Statistics, Spanish')
    tutor, tutor_id = make('disc-tutor@student.ubc.ca', 'Tutor', 'Guitar, Statistics, Spanish', 'Python', 'online')
    other, other_id = make('disc-other@student.ubc.ca', 'Other', 'Drawing', 'Piano')


def test_filters_are_server_side_and_unrated_are_not_zero():
    assert learner.get('/skillshare/discover', params={'minimum_rating': 'none'}).status_code == 422
    assert learner.get('/skillshare/catalog').json() == {'skills': ['Drawing', 'Guitar', 'Piano', 'Python', 'Spanish', 'Statistics']}
    response = learner.get('/skillshare/discover', params={'seeking': 'guitar', 'offering': 'python', 'meeting': 'online', 'category': 'music'})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body['count'] == 1
    result = body['results'][0]
    assert result['profile']['name'] == 'Tutor' and result['mutual'] is True
    assert result['rating'] == {'average': None, 'completed_reviews': 0}
    assert result['categories'] == ['technical', 'academic', 'music', 'languages']
    assert learner.get('/skillshare/discover', params={'category': 'design'}).json()['count'] == 0
    assert not ({'email', 'photo', 'xp', 'reviewer_id', 'scheduled_for'} & result['profile'].keys())
    assert learner.get('/skillshare/discover', params={'seeking': 'guit'}).json()['count'] == 0
    assert learner.get('/skillshare/discover', params={'seeking': 'unknown'}).json()['count'] == 0
    assert learner.get('/skillshare/discover', params={'seeking': ' '}).json()['count'] == 0
    assert learner.get('/skillshare/discover', params={'offering': ' '}).json()['count'] == 0
    assert learner.get('/skillshare/discover', params={'minimum_rating': 3}).json()['count'] == 0
    assert learner.get('/skillshare/discover', params={'minimum_rating': 0}).status_code == 422
    assert learner.get('/skillshare/discover', params={'limit': 0}).status_code == 422
    assert shared_app.url_path_for('discover')


def test_unmatched_cannot_schedule_or_rate():
    response = learner.post('/skillshare/exchanges', json={'partner_id': other_id, 'scheduled_for': '2020-01-01T12:00:00Z'})
    assert response.status_code == 403
    assert learner.put('/skillshare/exchanges/1/review', json={'learned': 5, 'taught': 5, 'collaboration': 5}).status_code == 404


def test_no_overlap_profiles_not_returned_as_unrelated_people():
    # Other teaches Drawing and wants Piano; learner cannot offer Piano and does not seek Drawing.
    assert all(result['profile']['name'] != 'Other' for result in learner.get('/skillshare/discover').json()['results'])


def lesson():
    like(learner, tutor, learner_id, tutor_id)
    response = learner.post('/skillshare/exchanges', json={'partner_id': tutor_id, 'scheduled_for': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()})
    assert response.status_code == 201, response.text
    assert learner.post('/skillshare/exchanges', json={'partner_id': tutor_id, 'scheduled_for': '2020-01-01T12:00:00Z'}).status_code == 409
    return response.json()['id']


def test_completion_is_mutual_and_nonparticipants_denied():
    exchange_id = lesson()
    score = {'learned': 4, 'taught': 5, 'collaboration': 3}
    for client in (learner, tutor):
        assert client.put(f'/skillshare/exchanges/{exchange_id}/review', json=score).status_code == 403
    assert other.put(f'/skillshare/exchanges/{exchange_id}/completion').status_code == 404
    assert other.put(f'/skillshare/exchanges/{exchange_id}/review', json=score).status_code == 404
    assert learner.put(f'/skillshare/exchanges/{exchange_id}/completion').json()['review'] == {
        'status': 'waiting_for_peer', 'can_rate': False, 'can_confirm_completion': False,
        'acknowledged_by_me': True, 'acknowledged_by_peer': False,
        'values': None,
    }
    assert learner.put(f'/skillshare/exchanges/{exchange_id}/completion').status_code == 409
    assert tutor.put(f'/skillshare/exchanges/{exchange_id}/completion').json()['review']['status'] == 'eligible'
    assert tutor.put(f'/skillshare/exchanges/{exchange_id}/completion').status_code == 409


def test_participant_upsert_aggregate_and_no_notes_or_authorship_leaks(isolated_database):
    exchange_id = 1
    assert learner.put(f'/skillshare/exchanges/{exchange_id}/review', json={'learned': 5, 'taught': 4, 'collaboration': 3}).status_code == 200
    response = learner.put(f'/skillshare/exchanges/{exchange_id}/review', json={'learned': 3, 'taught': 3, 'collaboration': 3})
    assert response.status_code == 200 and response.json()['learned'] == 3 and response.json()['taught'] == 3
    assert tutor.put(f'/skillshare/exchanges/{exchange_id}/review', json={'learned': 5, 'taught': 5, 'collaboration': 5}).status_code == 200
    assert learner.get('/skillshare/exchanges').json()[0]['review']['values'] == {'learned': 3, 'taught': 3, 'collaboration': 3}
    assert learner.get(f'/skillshare/exchanges/{exchange_id}').status_code == 404
    assert tutor.get(f'/skillshare/exchanges/{exchange_id}/review').status_code == 405
    Session = sessionmaker(bind=isolated_database)
    with Session() as db:
        assert db.query(models.SkillReview).filter_by(exchange_id=exchange_id).count() == 2
    assert learner.get('/skillshare/discover').json()['results'][0]['rating'] == {'average': 3.0, 'completed_reviews': 1}
    assert learner.get('/skillshare/discover', params={'minimum_rating': 4}).json()['count'] == 0
    assert learner.get('/skillshare/discover', params={'minimum_rating': 3}).json()['count'] == 1
    assert tutor.get('/skillshare/discover').json()['results'][0]['rating'] == {'average': 5.0, 'completed_reviews': 1}
    observer = api('disc-observer@student.ubc.ca')
    observer.post('/users', json={'name': 'Observer', 'skills_teach': 'Python', 'skills_learn': 'Guitar'})
    by_name = {result['profile']['name']: result['rating'] for result in observer.get('/skillshare/discover').json()['results']}
    assert by_name['Tutor'] == {'average': 3.0, 'completed_reviews': 1}
    assert 'Other' not in by_name
    assert 'Learner' not in by_name  # one-sided matches are not mutual discovery candidates


def test_future_and_naive_schedules_rejected():
    future = api('disc-future@student.ubc.ca')
    future_id = future.post('/users', json={'name': 'Future', 'skills_teach': 'Guitar', 'skills_learn': 'Python'}).json()['id']
    like(learner, future, learner_id, future_id)
    assert learner.post('/skillshare/exchanges', json={'partner_id': future_id, 'scheduled_for': '2020-01-01 12:00:00'}).status_code == 422
    future_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    exchange = learner.post('/skillshare/exchanges', json={'partner_id': future_id, 'scheduled_for': future_date}).json()
    assert learner.put(f"/skillshare/exchanges/{exchange['id']}/completion").status_code == 409


def test_requires_authentication():
    response = TestClient(shared_app)
    previous = shared_app.dependency_overrides.pop(auth.current_email, None)
    try:
        assert response.get('/skillshare/discover').status_code == 401
        assert response.get('/skillshare/exchanges').status_code == 401
        assert response.put('/skillshare/exchanges/1/review', json={'learned': 5, 'taught': 5, 'collaboration': 5}).status_code == 401
    finally:
        if previous is not None:
            shared_app.dependency_overrides[auth.current_email] = previous


def test_self_constrained_schema_and_additive_tables(isolated_database):
    Base.metadata.create_all(bind=isolated_database)
    assert {'skill_exchanges', 'skill_reviews'} <= set(inspect(isolated_database).get_table_names())
    Session = sessionmaker(bind=isolated_database)
    with Session() as db:
        review = db.query(models.SkillReview).filter_by(exchange_id=1, reviewer_id=learner_id).one()
        review.reviewee_id = learner_id
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        tutor_result = next(result for result in learner.get('/skillshare/discover').json()['results'] if result['profile']['name'] == 'Tutor')
        assert tutor_result['rating']['completed_reviews'] == 1
