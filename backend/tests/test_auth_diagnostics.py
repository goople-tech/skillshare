"""Owner-only lookup instrumentation with no identity/request raw fields."""
import logging

from app import auth
from tests.test_profiles import as_user, client


def test_current_user_diagnostic_describes_outcomes_without_private_data(monkeypatch, caplog):
    as_user('instrumented@student.ubc.ca')
    client.post('/users', json={'name': 'Instrumented'})
    monkeypatch.setenv('AUTH_REQUEST_DIAGNOSTICS', 'true')
    caplog.set_level(logging.INFO, logger='ubcver.auth_diagnostic')
    assert client.get('/me').status_code == 200
    assert 'current_user: dependency entered' in caplog.text
    assert 'current_user: profile found' in caplog.text
    assert 'GET /me: route body reached' in caplog.text
    as_user('instrumented-missing@student.ubc.ca')
    assert client.get('/me').status_code == 404
    assert 'current_user: profile not found' in caplog.text
    assert 'instrumented' not in caplog.text
    assert 'Bearer' not in caplog.text
