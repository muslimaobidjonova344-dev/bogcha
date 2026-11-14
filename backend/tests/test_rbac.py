import pytest
from conftest import add_child


@pytest.mark.parametrize("path", ["/api/v1/admin/dashboard", "/api/v1/admin/users", "/api/v1/admin/audit-logs", "/api/v1/admin/providers"])
def test_admin_endpoints_forbidden_for_others(client, make_user, path):
    for role in ("parent", "kindergarten_admin", "tutor"):
        u = make_user(f"{role}@test.uz", role)
        assert client.get(path, headers=u["headers"]).status_code == 403
    assert client.get(path).status_code == 401


def test_parent_cannot_use_provider_endpoints(client, make_user):
    p = make_user("p@test.uz")
    assert client.get("/api/v1/me/provider", headers=p["headers"]).status_code == 403
    assert client.get("/api/v1/me/provider/applications", headers=p["headers"]).status_code == 403


def test_provider_cannot_use_parent_endpoints(client, make_user):
    k = make_user("k@test.uz", "kindergarten_admin")
    assert client.get("/api/v1/children", headers=k["headers"]).status_code == 403
    assert client.get("/api/v1/parents/dashboard", headers=k["headers"]).status_code == 403


def test_tutor_cannot_manage_groups_and_kg_cannot_manage_services(client, make_user):
    t = make_user("t@test.uz", "tutor")
    k = make_user("k@test.uz", "kindergarten_admin")
    assert client.get("/api/v1/me/provider/groups", headers=t["headers"]).status_code == 403
    assert client.get("/api/v1/me/provider/services", headers=k["headers"]).status_code == 403
    assert client.get("/api/v1/me/provider/schedule", headers=k["headers"]).status_code == 403


def test_parent_sees_only_own_children(client, make_user):
    a, b = make_user("a@test.uz"), make_user("b@test.uz")
    cid = add_child(client, a)
    assert client.get(f"/api/v1/children/{cid}", headers=a["headers"]).status_code == 200
    assert client.get(f"/api/v1/children/{cid}", headers=b["headers"]).status_code == 404
    assert client.patch(f"/api/v1/children/{cid}", headers=b["headers"], json={"first_name": "X"}).status_code == 404
    assert client.delete(f"/api/v1/children/{cid}", headers=b["headers"]).status_code == 404
    assert client.get("/api/v1/children", headers=b["headers"]).json() == []


def test_admin_cannot_block_self_or_change_own_role(client, admin, db):
    from app.models import User
    me = db.query(User).filter(User.email == "admin@test.uz").first()
    assert client.post(f"/api/v1/admin/users/{me.id}/block", headers=admin["headers"], json={"reason": "test"}).status_code == 409
    assert client.post(f"/api/v1/admin/users/{me.id}/role", headers=admin["headers"], json={"role": "parent"}).status_code == 409


def test_admin_block_user_revokes_access(client, admin, make_user):
    u = make_user("u@test.uz")
    assert client.post(f"/api/v1/admin/users/{u['id']}/block", headers=admin["headers"], json={"reason": "spam"}).status_code == 200
    assert client.get("/api/v1/auth/me", headers=u["headers"]).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "u@test.uz", "password": "Parol12345"}).status_code == 403
    assert client.post(f"/api/v1/admin/users/{u['id']}/unblock", headers=admin["headers"]).status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": "u@test.uz", "password": "Parol12345"}).status_code == 200


def test_audit_log_written_for_admin_actions(client, admin, make_user):
    u = make_user("u@test.uz")
    client.post(f"/api/v1/admin/users/{u['id']}/block", headers=admin["headers"], json={"reason": "spam"})
    logs = client.get("/api/v1/admin/audit-logs?action=admin.user_blocked", headers=admin["headers"]).json()
    assert logs["total"] == 1
