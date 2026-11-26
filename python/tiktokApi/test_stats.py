import asyncio

from tiktokApi.engine import post_of, signed_in, user_of
from tiktokApi.transport import studio_query


class Answer:
    def __init__(self, status, data):
        self.status_code = status
        self.data = data
        self.text = "" if data is None else "x"

    def json(self):
        if self.data is None:
            raise ValueError("empty")
        return self.data


class Session:
    def __init__(self, answer):
        self.answer = answer

    async def get(self, url, **_):
        return self.answer


def test_a_signed_in_studio_user_is_logged_in():
    data, dead = asyncio.run(signed_in(Session(Answer(200, {"statusCode": 0, "userId": "7185869559001760774", "tt-csrf-token": "t"}))))
    assert dead is None and data["userId"] == "7185869559001760774"


def test_user_id_zero_means_the_cookies_are_not_signed_in():
    data, dead = asyncio.run(signed_in(Session(Answer(200, {"statusCode": 0, "userId": "0"}))))
    assert data is None and dead["loginState"] == "loggedOut" and dead["code"] == "sessionDead"


def test_a_redirect_means_logged_out():
    data, dead = asyncio.run(signed_in(Session(Answer(302, None))))
    assert data is None and dead["httpStatus"] == 302


def test_a_studio_item_reads_as_numbers():
    post = post_of({"item_id": "7708913986665712917", "desc": "logLaunchVideo", "post_time": "1794872580", "duration": 31500, "play_count": "1158", "like_count": "90", "comment_count": "0", "share_count": "1", "favorite_count": "5", "status": 102, "visibility": 0, "in_review": False, "is_pinned": False})
    assert post == {"id": "7708913986665712917", "caption": "logLaunchVideo", "postedAt": 1794872580, "seconds": 31.5, "views": 1158, "likes": 90, "comments": 0, "shares": 1, "saves": 5, "status": 102, "visibility": 0, "inReview": False, "pinned": False}


def test_the_user_takes_its_handle_and_region():
    user = user_of({"userId": "1", "userBaseInfo": {"UserProfile": {"UserBase": {"UniqueId": "tiktokAccount", "NickName": "Grace", "Region": {"Region": "CA"}}}}})
    assert user == {"userId": "1", "uniqueId": "tiktokAccount", "nickname": "Grace", "region": "CA"}


def test_studio_queries_carry_the_cookie_region_and_ms_token():
    query = studio_query({"store-country-code": "ca", "msToken": "m"}, {"userId": "1"})
    assert query["region"] == "CA" and query["priority_region"] == "CA" and query["msToken"] == "m" and query["userId"] == "1" and query["aid"] == "1988"


def test_a_post_carries_the_caption_the_video_and_who_can_see_it():
    from tiktokApi.engine import post_body

    body = post_body("v1c025g50000dbv10r7og65nl0rr4iv0", "log direct test", {"Duration": 6, "Width": 1080, "Height": 1920}, 1)
    feature = body["single_post_req_list"][0]["single_post_feature_info"]
    assert body["single_post_req_list"][0]["video_id"] == "v1c025g50000dbv10r7og65nl0rr4iv0"
    assert body["feature_common_info_list"][0]["vedit_common_info"]["video_id"] == "v1c025g50000dbv10r7og65nl0rr4iv0"
    assert body["feature_common_info_list"][0]["privacy_setting_info"]["visibility_type"] == 1
    assert feature["text"] == "log direct test" and feature["markup_text"] == "log direct test"
    assert feature["video_track_time_range_list"] == [{"start_time_in_ms": 0, "end_time_in_ms": 6000}]
    assert len(body["post_common_info"]["creation_id"]) == 21
