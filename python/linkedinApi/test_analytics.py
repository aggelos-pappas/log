from linkedinApi.analytics import metrics_of, texts_of


def rsc(*texts):
    return "\n".join(f'1:["$","span",null,{{"children":["{t}"]}}]' for t in texts)


SUMMARY = rsc("Post analytics", "Discovery", "1,486", "Impressions", "Feed post", "Video performance", "175", "Video views", "Watch time", "56m 6s", "Average watch time", "19s", "Profile activity", "2", "Profile viewers from this post", "0", "Followers gained from this post", "Engagement", "24", "Social engagements", "These numbers are an estimate and may not be precise.", "Impressions", "The number of times your post was shown to members.")
SLOW = rsc("In-network (followers and connections)", "70%", "Out-of-network", "30%", "249", "Members reached", "Kamloops, BC", "47%")


def test_the_post_analytics_answers_give_impressions_reach_and_video():
    metrics = metrics_of(texts_of(SUMMARY) + texts_of(SLOW))
    assert metrics["impressions"] == 1486
    assert metrics["membersReached"] == 249
    assert metrics["inNetwork"] == "70%" and metrics["outOfNetwork"] == "30%"
    assert metrics["videoViews"] == 175
    assert metrics["watchTime"] == "56m 6s" and metrics["averageWatchTime"] == "19s"
    assert metrics["profileViewers"] == 2 and metrics["followersGained"] == 0
    assert metrics["engagements"] == 24


def test_a_label_whose_neighbour_is_not_a_number_is_left_out():
    assert metrics_of(["Profile activity", "Impressions"]) == {}


def test_references_and_plain_text_are_not_read_as_values():
    assert texts_of('{"children":["$L20"]} {"children":["486"]}') == ["486"]
