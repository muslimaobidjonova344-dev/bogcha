from datetime import date
from conftest import add_child
from app.models import ApplicationHistory, KindergartenGroup, Notification, Provider

API = "/api/v1"


def apply(client, parent, kg, child_id):
    return client.post(f"{API}/applications/kindergarten", headers=parent["headers"],
                       json={"child_id": child_id, "provider_id": kg["provider_id"], "group_id": kg["group_id"], "parent_note": "Iltimos"})


def test_unverified_parent_cannot_apply(client, make_user, approved_kg):
    p = make_user("p@test.uz", verify=False)
    cid = add_child(client, p)
    assert apply(client, p, approved_kg, cid).status_code == 403


def test_apply_creates_history_and_notifications(client, make_user, approved_kg, db):
    p = make_user("p@test.uz")
    cid = add_child(client, p)
    r = apply(client, p, approved_kg, cid)
    assert r.status_code == 201 and r.json()["status"] == "SUBMITTED"
    aid = r.json()["id"]
    assert db.query(ApplicationHistory).filter(ApplicationHistory.application_id == aid).count() == 1
    assert db.query(Notification).filter(Notification.user_id == p["id"], Notification.type == "application_submitted").count() == 1
    assert db.query(Notification).filter(Notification.user_id == approved_kg["user"]["id"]).count() >= 1


def test_duplicate_active_application_rejected(client, make_user, approved_kg):
    p = make_user("p@test.uz")
    cid = add_child(client, p)
    assert apply(client, p, approved_kg, cid).status_code == 201
    assert apply(client, p, approved_kg, cid).status_code == 409


def test_age_mismatch_rejected(client, make_user, approved_kg):
    p = make_user("p@test.uz")
    cid = add_child(client, p, years=9)
    assert apply(client, p, approved_kg, cid).status_code == 422


def test_cannot_apply_with_other_parents_child(client, make_user, approved_kg):
    a, b = make_user("a@test.uz"), make_user("b@test.uz")
    cid = add_child(client, a)
    assert apply(client, b, approved_kg, cid).status_code == 404


def test_cannot_apply_to_unapproved_provider(client, make_user, db):
    k = make_user("k2@test.uz", "kindergarten_admin")
    p = make_user("p@test.uz")
    cid = add_child(client, p)
    prov = db.query(Provider).filter(Provider.owner_user_id == k["id"]).first()
    r = client.post(f"{API}/applications/kindergarten", headers=p["headers"], json={"child_id": cid, "provider_id": prov.id, "group_id": "x"})
    assert r.status_code == 404


def test_status_flow_history_and_notifications(client, make_user, approved_kg, db):
    p = make_user("p@test.uz")
    cid = add_child(client, p)
    aid = apply(client, p, approved_kg, cid).json()["id"]
    kh = approved_kg["user"]["headers"]
    url = f"{API}/me/provider/applications/{aid}/status"
    assert client.post(url, headers=kh, json={"status": "REJECTED"}).status_code == 422  # izoh majburiy
    assert client.post(url, headers=kh, json={"status": "UNDER_REVIEW"}).status_code == 200
    assert client.post(url, headers=kh, json={"status": "INTERVIEW_SCHEDULED", "interview_at": "2020-01-01T10:00:00+05:00"}).status_code == 422
    assert client.post(url, headers=kh, json={"status": "INTERVIEW_SCHEDULED", "interview_at": "2099-01-01T10:00:00+05:00"}).status_code == 200
    assert client.post(url, headers=kh, json={"status": "ACCEPTED"}).status_code == 200
    assert client.post(url, headers=kh, json={"status": "UNDER_REVIEW"}).status_code == 409  # terminal holatdan qaytib bo'lmaydi
    hist = client.get(f"{API}/applications/mine/{aid}", headers=p["headers"]).json()["history"]
    assert [h["to_status"] for h in hist] == ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_SCHEDULED", "ACCEPTED"]
    assert db.query(Notification).filter(Notification.user_id == p["id"], Notification.type == "application_accepted").count() == 1


def test_group_capacity_enforced_and_free_places_update(client, make_user, approved_kg, db):
    kh = approved_kg["user"]["headers"]
    parents = [make_user(f"p{i}@test.uz") for i in range(3)]
    ids = []
    for p in parents:
        cid = add_child(client, p)
        ids.append(apply(client, p, approved_kg, cid).json()["id"])
    codes = [client.post(f"{API}/me/provider/applications/{a}/status", headers=kh, json={"status": "ACCEPTED"}).status_code for a in ids]
    assert codes == [200, 200, 409]  # sig'im 2
    g = db.get(KindergartenGroup, approved_kg["group_id"])
    db.refresh(g)
    assert g.current_count == 2 and g.free_places == 0
    # bekor qilinsa joy bo'shaydi
    r = client.post(f"{API}/applications/mine/{ids[0]}/cancel", headers=parents[0]["headers"], json={})
    assert r.status_code == 200
    db.refresh(g)
    assert g.current_count == 1
    assert client.post(f"{API}/me/provider/applications/{ids[2]}/status", headers=kh, json={"status": "ACCEPTED"}).status_code == 200


def test_provider_sees_only_own_applications(client, make_user, approved_kg):
    p = make_user("p@test.uz")
    aid = apply(client, p, approved_kg, add_child(client, p)).json()["id"]
    other = make_user("k3@test.uz", "kindergarten_admin")
    assert client.get(f"{API}/me/provider/applications/{aid}", headers=other["headers"]).status_code == 404
    assert client.post(f"{API}/me/provider/applications/{aid}/status", headers=other["headers"], json={"status": "UNDER_REVIEW"}).status_code == 404
    assert client.get(f"{API}/me/provider/applications", headers=other["headers"]).json()["total"] == 0
    other_parent = make_user("p2@test.uz")
    assert client.get(f"{API}/applications/mine/{aid}", headers=other_parent["headers"]).status_code == 404


def test_child_secret_info_hidden_until_accepted(client, make_user, approved_kg):
    p = make_user("p@test.uz")
    cid = client.post(f"{API}/children", headers=p["headers"], json={"first_name": "A", "last_name": "B", "birth_date": date(date.today().year - 4, 1, 1).isoformat(),
                                                                   "extra_info": "MAXFIY"}).json()["id"]
    aid = apply(client, p, approved_kg, cid).json()["id"]
    kh = approved_kg["user"]["headers"]
    d = client.get(f"{API}/me/provider/applications/{aid}", headers=kh).json()
    assert d["child"]["extra_info"] is None and d["parent"]["phone"] is None
    client.post(f"{API}/me/provider/applications/{aid}/status", headers=kh, json={"status": "ACCEPTED"})
    assert client.get(f"{API}/me/provider/applications/{aid}", headers=kh).json()["child"]["extra_info"] == "MAXFIY"


def test_more_info_flow(client, make_user, approved_kg):
    p = make_user("p@test.uz")
    aid = apply(client, p, approved_kg, add_child(client, p)).json()["id"]
    kh = approved_kg["user"]["headers"]
    client.post(f"{API}/me/provider/applications/{aid}/status", headers=kh, json={"status": "MORE_INFO_REQUIRED", "note": "Tibbiy ma'lumotnoma kerak"})
    r = client.post(f"{API}/applications/mine/{aid}/respond", headers=p["headers"], json={"note": "Yuboraman"})
    assert r.status_code == 200 and r.json()["status"] == "UNDER_REVIEW"


def test_deleted_child_with_active_application_blocked(client, make_user, approved_kg):
    p = make_user("p@test.uz")
    cid = add_child(client, p)
    apply(client, p, approved_kg, cid)
    assert client.delete(f"{API}/children/{cid}", headers=p["headers"]).status_code == 409
