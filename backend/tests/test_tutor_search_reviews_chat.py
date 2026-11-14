from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from conftest import add_child
from app.models import District, Provider, ProviderDocument, Region, UploadedFile, Lesson, LessonBooking

API = "/api/v1"
TZ = ZoneInfo("Asia/Tashkent")


def next_weekday_at(wd: int, hour: int, minute: int = 0) -> datetime:
    d = datetime.now(TZ) + timedelta(days=1)
    while d.isoweekday() != wd:
        d += timedelta(days=1)
    return d.replace(hour=hour, minute=minute, second=0, microsecond=0)


def make_tutor(client, db, make_user, admin, email="t@test.uz"):
    u = make_user(email, "tutor")
    p = db.query(Provider).filter(Provider.owner_user_id == u["id"]).first()
    reg = db.query(Region).first(); dist = db.query(District).filter(District.region_id == reg.id).first()
    assert client.put(f"{API}/me/provider", headers=u["headers"], json={"name": "Repetitor", "region_id": reg.id, "district_id": dist.id, "address": "A", "phone": "+998901234567",
                                                                       "experience_years": 5, "lesson_mode": "both", "lat": 41.3, "lng": 69.2}).status_code == 200
    s = client.post(f"{API}/me/provider/services", headers=u["headers"], json={"subject": "Matematika", "education_level": "5–9-sinf", "grades": ["6"], "duration_minutes": 60,
                                                                              "format": "individual", "mode": "offline", "price": 200000})
    assert s.status_code == 201, s.text
    assert client.put(f"{API}/me/provider/schedule", headers=u["headers"], json={"windows": [{"weekday": 3, "start_time": "15:00", "end_time": "18:00"}]}).status_code == 200
    f = UploadedFile(owner_id=u["id"], bucket="documents", path="x/y.pdf", filename="d.pdf", content_type="application/pdf", size=10); db.add(f); db.flush()
    doc = ProviderDocument(provider_id=p.id, doc_type="diploma", file_id=f.id); db.add(doc); db.commit()
    client.post(f"{API}/admin/documents/{doc.id}/review", headers=admin["headers"], json={"status": "approved"})
    assert client.post(f"{API}/admin/providers/{p.id}/verification", headers=admin["headers"], json={"status": "approved"}).status_code == 200
    return {"user": u, "provider_id": p.id, "service_id": s.json()["id"]}


def req(client, parent, t, child, start):
    return client.post(f"{API}/applications/tutor", headers=parent["headers"], json={"child_id": child, "provider_id": t["provider_id"], "service_id": t["service_id"],
                                                                                    "desired_slot_start": start.isoformat()})


def test_overlapping_schedule_windows_rejected(client, make_user):
    u = make_user("t@test.uz", "tutor")
    r = client.put(f"{API}/me/provider/schedule", headers=u["headers"], json={"windows": [
        {"weekday": 1, "start_time": "10:00", "end_time": "12:00"}, {"weekday": 1, "start_time": "11:00", "end_time": "13:00"}]})
    assert r.status_code == 422


def test_tutor_double_booking_prevented(client, db, make_user, admin):
    t = make_tutor(client, db, make_user, admin)
    p1, p2 = make_user("p1@test.uz"), make_user("p2@test.uz")
    c1, c2 = add_child(client, p1, years=10), add_child(client, p2, years=11)
    slot = next_weekday_at(3, 15)
    a1 = req(client, p1, t, c1, slot)
    assert a1.status_code == 201, a1.text
    a2 = req(client, p2, t, c2, slot)
    assert a2.status_code == 201  # so'rov yuborish mumkin, band qilish qabul paytida
    th = t["user"]["headers"]
    assert client.post(f"{API}/me/provider/applications/{a1.json()['id']}/status", headers=th, json={"status": "ACCEPTED"}).status_code == 200
    # endi bu vaqt band: qabul rad etiladi, yangi so'rov ham yuborib bo'lmaydi
    r = client.post(f"{API}/me/provider/applications/{a2.json()['id']}/status", headers=th, json={"status": "ACCEPTED"})
    assert r.status_code == 409
    p3 = make_user("p3@test.uz")
    assert req(client, p3, t, add_child(client, p3, years=9), slot + timedelta(minutes=30)).status_code == 409
    assert req(client, p3, t, add_child(client, p3, "Vali", years=9), slot + timedelta(hours=1)).status_code == 201


def test_slot_outside_working_window_rejected(client, db, make_user, admin):
    t = make_tutor(client, db, make_user, admin)
    p = make_user("p@test.uz")
    assert req(client, p, t, add_child(client, p, years=10), next_weekday_at(3, 20)).status_code == 422
    assert req(client, p, t, add_child(client, p, "B", years=10), next_weekday_at(2, 16)).status_code == 422


def test_cancel_accepted_frees_slot(client, db, make_user, admin):
    t = make_tutor(client, db, make_user, admin)
    p = make_user("p@test.uz")
    slot = next_weekday_at(3, 16)
    a = req(client, p, t, add_child(client, p, years=10), slot).json()["id"]
    client.post(f"{API}/me/provider/applications/{a}/status", headers=t["user"]["headers"], json={"status": "ACCEPTED"})
    assert db.query(LessonBooking).filter(LessonBooking.status == "booked").count() == 1
    client.post(f"{API}/applications/mine/{a}/cancel", headers=p["headers"], json={})
    assert db.query(LessonBooking).filter(LessonBooking.status == "booked").count() == 0
    p2 = make_user("p2@test.uz")
    assert req(client, p2, t, add_child(client, p2, years=10), slot).status_code == 201


def test_search_hides_unapproved_and_filters_combine(client, db, make_user, admin, approved_kg):
    make_user("hidden@test.uz", "kindergarten_admin")  # tasdiqlanmagan
    r = client.get(f"{API}/kindergartens").json()
    assert r["total"] == 1 and r["items"][0]["verified"] is True
    assert client.get(f"{API}/kindergartens?age=4&max_price=600000&ownership=private&has_places=true").json()["total"] == 1
    assert client.get(f"{API}/kindergartens?age=4&max_price=100000").json()["total"] == 0
    assert client.get(f"{API}/kindergartens?age=10").json()["total"] == 0
    assert client.get(f"{API}/kindergartens?ownership=state").json()["total"] == 0
    assert client.get(f"{API}/kindergartens?q=Test").json()["total"] == 1
    assert client.get(f"{API}/kindergartens/{approved_kg['provider_id']}").status_code == 200


def test_unapproved_provider_profile_not_public(client, db, make_user):
    k = make_user("k@test.uz", "kindergarten_admin")
    pid = db.query(Provider).filter(Provider.owner_user_id == k["id"]).first().id
    assert client.get(f"{API}/kindergartens/{pid}").status_code == 404


def test_tutor_search_filters(client, db, make_user, admin):
    make_tutor(client, db, make_user, admin)
    assert client.get(f"{API}/tutors?subject=Matem&max_price=250000&weekday=3&min_experience=3").json()["total"] == 1
    assert client.get(f"{API}/tutors?subject=Fizika").json()["total"] == 0
    assert client.get(f"{API}/tutors?weekday=1").json()["total"] == 0
    assert client.get(f"{API}/tutors?mode=online").json()["total"] == 0
    assert client.get(f"{API}/tutors?grade=6").json()["total"] == 1


def test_distance_filter(client, approved_kg):
    assert client.get(f"{API}/kindergartens?lat=41.3&lng=69.2&max_distance_km=5").json()["total"] == 1
    assert client.get(f"{API}/kindergartens?lat=39.6&lng=66.9&max_distance_km=5").json()["total"] == 0


def test_compare_requires_2_to_4_same_type(client, approved_kg, db, make_user, admin):
    pid = approved_kg["provider_id"]
    assert client.get(f"{API}/compare?ids={pid}").status_code == 422
    t = make_tutor(client, db, make_user, admin)
    assert client.get(f"{API}/compare?ids={pid},{t['provider_id']}").status_code == 422


def test_reviews_only_after_acceptance_and_rating_computed(client, make_user, approved_kg, db):
    p = make_user("p@test.uz")
    body = {"provider_id": approved_kg["provider_id"], "rating": 5, "comment": "Zo'r"}
    assert client.post(f"{API}/reviews", headers=p["headers"], json=body).status_code == 403
    aid = client.post(f"{API}/applications/kindergarten", headers=p["headers"], json={"child_id": add_child(client, p), "provider_id": approved_kg["provider_id"],
                                                                                       "group_id": approved_kg["group_id"]}).json()["id"]
    client.post(f"{API}/me/provider/applications/{aid}/status", headers=approved_kg["user"]["headers"], json={"status": "ACCEPTED"})
    assert client.post(f"{API}/reviews", headers=p["headers"], json={**body, "rating": 6}).status_code == 422
    assert client.post(f"{API}/reviews", headers=p["headers"], json=body).status_code == 201
    assert client.post(f"{API}/reviews", headers=p["headers"], json=body).status_code == 409
    prov = db.get(Provider, approved_kg["provider_id"]); db.refresh(prov)
    assert prov.rating_avg == 5.0 and prov.rating_count == 1


def test_admin_hiding_review_recalculates_rating(client, make_user, approved_kg, admin, db):
    p = make_user("p@test.uz")
    aid = client.post(f"{API}/applications/kindergarten", headers=p["headers"], json={"child_id": add_child(client, p), "provider_id": approved_kg["provider_id"],
                                                                                       "group_id": approved_kg["group_id"]}).json()["id"]
    client.post(f"{API}/me/provider/applications/{aid}/status", headers=approved_kg["user"]["headers"], json={"status": "ACCEPTED"})
    rid = client.post(f"{API}/reviews", headers=p["headers"], json={"provider_id": approved_kg["provider_id"], "rating": 1, "comment": "x"}).json()["id"]
    assert client.post(f"{API}/admin/reviews/{rid}/moderate", headers=admin["headers"], json={"status": "hidden"}).status_code == 200
    prov = db.get(Provider, approved_kg["provider_id"]); db.refresh(prov)
    assert prov.rating_count == 0
    assert client.get(f"{API}/providers/{approved_kg['provider_id']}/reviews").json()["total"] == 0


def test_provider_cannot_be_approved_without_approved_document(client, make_user, admin, db):
    k = make_user("k@test.uz", "kindergarten_admin")
    pid = db.query(Provider).filter(Provider.owner_user_id == k["id"]).first().id
    r = client.post(f"{API}/admin/providers/{pid}/verification", headers=admin["headers"], json={"status": "approved"})
    assert r.status_code == 409


def test_favorites(client, make_user, approved_kg):
    p = make_user("p@test.uz")
    assert client.put(f"{API}/favorites/{approved_kg['provider_id']}", headers=p["headers"]).status_code == 200
    assert client.put(f"{API}/favorites/{approved_kg['provider_id']}", headers=p["headers"]).status_code == 200
    assert len(client.get(f"{API}/favorites", headers=p["headers"]).json()) == 1
    assert client.delete(f"{API}/favorites/{approved_kg['provider_id']}", headers=p["headers"]).status_code == 200
    assert client.get(f"{API}/favorites", headers=p["headers"]).json() == []


def test_chat_flow_and_privacy(client, make_user, approved_kg):
    p, other = make_user("p@test.uz"), make_user("o@test.uz")
    kh = approved_kg["user"]["headers"]
    cid = client.post(f"{API}/conversations", headers=p["headers"], json={"provider_id": approved_kg["provider_id"]}).json()["id"]
    assert client.post(f"{API}/conversations/{cid}/messages", headers=p["headers"], json={"body": "Salom"}).status_code == 201
    assert client.post(f"{API}/conversations/{cid}/messages", headers=p["headers"], json={"body": "   "}).status_code == 422
    convs = client.get(f"{API}/conversations", headers=kh).json()
    assert convs[0]["unread_count"] == 1 and convs[0]["last_message"]["body"] == "Salom"
    assert client.get(f"{API}/conversations/{cid}/messages", headers=other["headers"]).status_code == 404  # begona kira olmaydi
    assert client.post(f"{API}/conversations/{cid}/messages", headers=other["headers"], json={"body": "hack"}).status_code == 404
    assert client.post(f"{API}/conversations/{cid}/read", headers=kh).status_code == 200
    assert client.get(f"{API}/conversations", headers=kh).json()[0]["unread_count"] == 0
    assert client.get(f"{API}/conversations/{cid}/messages", headers=p["headers"]).json()[0]["read_at"] is not None
    assert client.post(f"{API}/conversations", headers=p["headers"], json={"provider_id": approved_kg["provider_id"]}).json()["id"] == cid  # takror yaratilmaydi


def test_notifications_and_settings(client, make_user, approved_kg):
    p = make_user("p@test.uz")
    client.post(f"{API}/applications/kindergarten", headers=p["headers"], json={"child_id": add_child(client, p), "provider_id": approved_kg["provider_id"], "group_id": approved_kg["group_id"]})
    n = client.get(f"{API}/notifications", headers=p["headers"]).json()
    assert n["unread"] == 1 and n["items"][0]["type"] == "application_submitted"
    assert client.post(f"{API}/notifications/read-all", headers=p["headers"]).status_code == 200
    assert client.get(f"{API}/notifications?unread_only=true", headers=p["headers"]).json()["total"] == 0
    assert client.put(f"{API}/notifications/settings", headers=p["headers"], json={"prefs": {"application_accepted": {"in_app": False, "email": False}}}).status_code == 200


def test_admin_dashboard_numbers_are_real(client, admin, approved_kg):
    d = client.get(f"{API}/admin/dashboard", headers=admin["headers"]).json()
    assert d["kindergartens"] == 1 and d["active_providers"] == 1 and d["total_applications"] == 0


def test_report_and_resolve(client, make_user, approved_kg, admin):
    p = make_user("p@test.uz")
    r = client.post(f"{API}/reports", headers=p["headers"], json={"target_type": "provider", "target_id": approved_kg["provider_id"], "reason": "Soxta"})
    assert r.status_code == 201
    assert client.post(f"{API}/reports", headers=p["headers"], json={"target_type": "provider", "target_id": approved_kg["provider_id"], "reason": "Soxta"}).status_code == 409
    rid = client.get(f"{API}/admin/reports", headers=admin["headers"]).json()["items"][0]["id"]
    assert client.post(f"{API}/admin/reports/{rid}/resolve", headers=admin["headers"], json={"status": "resolved"}).status_code == 200


def test_health_and_docs(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/api/openapi.json").status_code == 200
