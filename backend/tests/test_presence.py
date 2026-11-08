import os
import tempfile
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(tempfile.mkdtemp(), 'presence.db')
from fastapi.testclient import TestClient
from app import auth
from app.main import app

EMAIL = {'value': 'presence@student.ubc.ca'}
app.dependency_overrides[auth.current_email] = lambda: EMAIL['value']
client = TestClient(app)

def profile():
    app.dependency_overrides[auth.current_email] = lambda: EMAIL['value']
    assert client.post('/users', json={'name': 'Presence test'}).status_code == 200

def test_presence_persists_until_explicit_delete_and_rejects_out_of_range():
    profile()
    assert client.get('/presence/me').json() == {'sharing': False, 'lat': None, 'lng': None}
    r = client.post('/presence', json={'lat': 49.2628, 'lng': -123.2505})
    assert r.status_code == 200
    assert client.get('/presence/me').json()['sharing'] is True
    assert len(client.get('/presence/heatmap').json()['areas']) == 1
    assert client.get('/presence/heatmap').json()['active_students'] == 1
    assert client.post('/presence', json={'lat': 91, 'lng': 0}).status_code == 400
    assert client.delete('/presence').json()['sharing'] is False
    assert client.get('/presence/me').json()['sharing'] is False
