from linkedinApi.engine import stats_of, updates_of


def normalized(updates):
    included, order = [], []
    for i, (text, likes, comments, shares, reposted) in enumerate(updates):
        urn = f"urn:li:fs_updateV2:(urn:li:activity:74000000000000000{i},MEMBER_SHARES)"
        order.append(urn)
        update = {"$type": "com.linkedin.voyager.feed.render.UpdateV2", "entityUrn": urn, "updateMetadata": {"urn": f"urn:li:activity:74000000000000000{i}"}, "commentary": {"text": {"text": text}}, "actor": {"subDescription": {"text": f"{i + 1}h • Edited"}}, "*socialDetail": f"social{i}"}
        if reposted:
            update["*resharedUpdate"] = "urn:li:fs_updateV2:(other)"
        included += [update, {"entityUrn": f"social{i}", "*totalSocialActivityCounts": f"counts{i}"}, {"entityUrn": f"counts{i}", "numLikes": likes, "numComments": comments, "numShares": shares, "reactionTypeCounts": [{"reactionType": "LIKE", "count": likes}]}]
    return {"data": {"*elements": list(reversed(order))}, "included": included}


def test_posts_come_in_linkedins_order_with_their_counts_joined():
    rows = [stats_of(u) for u in updates_of(normalized([("first", 1, 0, 0, False), ("second", 5, 2, 0, False)]))]
    assert [r["text"] for r in rows] == ["second", "first"]
    assert rows[0] == {"activityId": "740000000000000001", "url": "https://www.linkedin.com/feed/update/urn:li:activity:740000000000000001/", "text": "second", "postedAgo": "2h", "repost": False, "content": None, "reactions": 5, "comments": 2, "reposts": 0, "reactionTypes": {"LIKE": 5}}


def test_a_repost_is_marked_so_its_numbers_read_as_the_originals():
    rows = [stats_of(u) for u in updates_of(normalized([("theirs", 2312, 94, 12, True)]))]
    assert rows[0]["repost"] is True and rows[0]["reactions"] == 2312


def test_the_older_elements_shape_still_reads():
    rows = updates_of({"elements": [{"updateMetadata": {"urn": "urn:li:activity:1"}, "socialDetail": {"totalSocialActivityCounts": {"numLikes": 3}}}]})
    assert stats_of(rows[0])["reactions"] == 3
