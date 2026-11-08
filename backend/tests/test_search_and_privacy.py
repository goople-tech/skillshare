import os
import tempfile
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(tempfile.mkdtemp(), 'search-privacy.db')
from fastapi.testclient import TestClient
from app.main import app
from app.privacy import aggregate_cell


def api(email):
    return TestClient(app, headers={'X-Test-Verified-Email': email})


def test_search_filters_and_capacity():
    owner = api('search-owner@student.ubc.ca')
    assert owner.post('/users', json={'name': 'Owner'}).status_code == 200
    specs = [
        {'category': 'study', 'title': 'CPSC 210 exam practice', 'tag': 'CPSC 210', 'location': 'in-person', 'capacity': 3},
        {'category': 'skill', 'title': 'Python exchange', 'description': 'Learn 100% Python', 'tag': 'Python', 'location': 'Online', 'capacity': 2},
        {'category': 'study', 'title': 'Hiking meeting', 'description': 'CPSC 210', 'location': 'in-person', 'capacity': 2},
    ]
    ids = []
    for spec in specs:
        response = owner.post('/listings', json=spec)
        assert response.status_code == 200, response.text
        ids.append(response.json()['id'])
    assert len(owner.get('/listings', params={'course': 'cpsc 210'}).json()) == 2
    assert [result['title'] for result in owner.get('/listings', params={'search': '100% Python'}).json()] == ['Python exchange']
    assert [result['title'] for result in owner.get('/listings', params={'search': '%'}).json()] == ['Python exchange']
    assert owner.get('/listings', params={'search': '_'}).json() == []
    assert owner.get('/listings', params={'category': 'study', 'meeting': 'online'}).json() == []
    assert len(owner.get('/listings', params={'skill': 'python', 'available': True}).json()) == 1
    assert len(owner.get('/listings', params={'meeting': 'in_person'}).json()) == 2
    assert owner.get('/listings', params={'limit': 0}).status_code == 422
    assert owner.get('/listings', params={'category': 'bad'}).status_code == 422
    assert owner.get('/listings', params={'search': 'x' * 201}).status_code == 422
    joiner = api('search-joiner@student.ubc.ca')
    assert joiner.post('/users', json={'name': 'Joiner'}).status_code == 200
    assert joiner.post(f'/listings/{ids[2]}/join').status_code == 200
    assert joiner.post(f'/listings/{ids[2]}/join').status_code == 400
    third = api('search-third@student.ubc.ca')
    third.post('/users', json={'name': 'Third'})
    assert third.post(f'/listings/{ids[2]}/join').status_code == 400
    assert owner.get('/listings', params={'search': 'Hiking', 'available': True}).json() == []


def test_match_privacy_and_area_only_heatmap():
    learner = api('private-learner@student.ubc.ca')
    learner.post('/users', json={'name': 'Private learner', 'skills_learn': 'Statistics', 'skills_teach': 'Python'})
    tutor = api('public-tutor@student.ubc.ca')
    tutor.post('/users', json={'name': 'Tutor', 'skills_learn': 'Python', 'skills_teach': 'Statistics', 'photo': 'private-data'})
    matches = learner.get('/skillshare/matches')
    assert matches.status_code == 200, matches.text
    tutor_public = [result['user'] for result in matches.json() if result['user']['name'] == 'Tutor'][0]
    assert 'email' not in tutor_public and 'photo' not in tutor_public
    assert learner.post('/presence', json={'lat': 49.2628, 'lng': -123.2505}).status_code == 200
    heat = learner.get('/presence/heatmap').json()
    lat, lng = aggregate_cell(49.2628, -123.2505)
    cells = [area for area in heat['areas'] if area['area']['lat'] == lat and area['area']['lng'] == lng]
    assert len(cells) == 1 and cells[0]['count'] == 1
