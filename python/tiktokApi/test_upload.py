from datetime import datetime, timezone

from tiktokApi.upload import aws4_headers, canonical_query, crc32_of, vid_of

TOKEN = {"AccessKeyId": "AKTPEXAMPLE", "SecretAccessKey": "secretExample", "SessionToken": "STS2example"}
WHEN = datetime(2026, 11, 17, 5, 26, 56, tzinfo=timezone.utc)


def test_a_get_is_signed_for_tiktoks_vod_gateway_with_only_the_date_and_token():
    headers = aws4_headers("GET", {"Action": "ApplyUploadInner", "Version": "2020-11-19"}, TOKEN, now=WHEN)
    assert headers["x-amz-date"] == "20261117T052656Z"
    assert headers["x-amz-security-token"] == "STS2example"
    assert headers["authorization"].startswith("AWS4-HMAC-SHA256 Credential=AKTPEXAMPLE/20261117/ap-singapore-1/vod/aws4_request, SignedHeaders=x-amz-date;x-amz-security-token, Signature=")
    assert headers == aws4_headers("GET", {"Version": "2020-11-19", "Action": "ApplyUploadInner"}, TOKEN, now=WHEN)


def test_a_post_also_signs_its_body_hash():
    headers = aws4_headers("POST", {"Action": "CommitUploadInner"}, TOKEN, body=b'{"SessionKey":"k"}', now=WHEN)
    assert "x-amz-content-sha256" in headers and "SignedHeaders=x-amz-content-sha256;x-amz-date;x-amz-security-token" in headers["authorization"]


def test_the_query_is_sorted_and_escaped_the_aws_way():
    assert canonical_query({"b": "2", "a": "x y", "c": "a/b"}) == "a=x%20y&b=2&c=a%2Fb"


def test_crc32_is_eight_hex_digits():
    assert crc32_of(b"") == "00000000" and crc32_of(b"log") == format(__import__("zlib").crc32(b"log"), "08x")


def test_the_video_id_comes_from_the_storage_post_upload_answer():
    answer = {"code": 2000, "data": {"post_upload_resp": {"results": [{"vid": "v1c025", "video_meta": {"Duration": 6}}]}}}
    assert vid_of(answer)["vid"] == "v1c025" and vid_of({"code": 2000, "data": {}}) is None
