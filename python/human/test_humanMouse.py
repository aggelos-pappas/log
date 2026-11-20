from __future__ import annotations

import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from human import humanMouse
from human.humanMouse import SyncHumanMouse, duration_for, reach, sample_interval, tremor


def walk(gestures, step=0.002):
    points = []
    for g in gestures:
        n = max(2, int(g.seconds / step))
        points.extend(g.at(g.seconds * i / n) for i in range(n + 1))
    return points


def test_fitts_longer_for_farther_and_smaller_targets():
    for seed in range(40):
        far_small = duration_for(random.Random(seed), 600, 20)
        near_small = duration_for(random.Random(seed + 1000), 100, 20)
        far_large = duration_for(random.Random(seed + 2000), 600, 200)
        assert far_small > near_small
        assert far_small > far_large


def test_fitts_lands_in_the_measured_ranges():
    long_moves = [duration_for(random.Random(s), 630, 20) for s in range(200)]
    short_moves = [duration_for(random.Random(s), 50, 120) for s in range(200)]
    assert 0.75 <= sum(long_moves) / len(long_moves) <= 0.85
    assert 0.25 <= sum(short_moves) / len(short_moves) <= 0.4


def test_path_ends_exactly_on_the_target():
    for seed in range(60):
        rng = random.Random(seed)
        tx, ty = rng.uniform(0, 1200), rng.uniform(0, 800)
        gestures = reach(rng, 640, 400, tx, ty, width=rng.choice([None, 20, 80]))
        if not gestures:
            continue
        last = gestures[-1]
        assert last.at(last.seconds) == (tx, ty)


def test_zero_to_two_corrections():
    counts = []
    for seed in range(200):
        gestures = reach(random.Random(seed), 100, 100, 730, 100, width=20)
        fixes = [g for g in gestures if g.kind == "correction"]
        assert len(fixes) <= 2
        assert gestures[0].note["corrections"] == len(fixes)
        assert "overshootPx" in gestures[0].note and "curvePx" in gestures[0].note
        counts.append(len(fixes))
    assert set(counts) == {0, 1, 2}


def test_corrections_are_shorter_and_slower_than_the_main_stroke():
    for seed in range(100):
        gestures = reach(random.Random(seed), 100, 100, 730, 100, width=20)
        main = gestures[0]
        main_len = math.dist((100, 100), main.at(main.seconds))
        for fix in gestures[1:]:
            gap = math.dist(fix.at(0), fix.at(fix.seconds))
            assert gap < main_len
            assert gap / fix.seconds < main_len / main.seconds


def test_main_stroke_speed_is_bell_shaped():
    for seed in range(40):
        main = reach(random.Random(seed), 100, 100, 730, 400, width=20)[0]
        n = 200
        points = [main.at(main.seconds * i / n) for i in range(n + 1)]
        speeds = [math.dist(points[i], points[i + 1]) for i in range(n)]
        peak = speeds.index(max(speeds)) / n
        assert 0.2 <= peak <= 0.7
        assert speeds[0] < max(speeds) * 0.3 and speeds[-1] < max(speeds) * 0.3


def test_sample_intervals_are_uneven_and_never_too_short():
    rng = random.Random(7)
    gaps = [sample_interval(rng) for _ in range(500)]
    assert len(set(round(g, 5) for g in gaps)) > 100
    assert min(gaps) >= humanMouse.MIN_INTERVAL
    assert abs(sum(gaps) / len(gaps) - 1 / humanMouse.EMIT_HZ) < 0.004


def test_tremor_stays_under_one_and_a_half_px_and_fades_when_fast():
    for seed in range(50):
        shake = tremor(random.Random(seed))
        still = [math.hypot(*shake(i / 1000, 0.0)) for i in range(1000)]
        fast = [math.hypot(*shake(i / 1000, 3000.0)) for i in range(1000)]
        assert max(still) < 1.5
        assert max(fast) < max(still) * 0.05


def test_same_seed_same_path():
    a = walk(reach(random.Random(3), 10, 10, 600, 300, width=30))
    b = walk(reach(random.Random(3), 10, 10, 600, 300, width=30))
    assert a == b


class FakeMouse:
    def __init__(self):
        self.moves = []

    def move(self, x, y):
        self.moves.append((x, y))


class FakePage:
    viewport_size = {"width": 1280, "height": 800}

    def __init__(self):
        self.mouse = FakeMouse()


def test_sync_glide_emits_uneven_samples_and_stops_on_target(monkeypatch):
    monkeypatch.setattr(humanMouse.myuriInput, "available", lambda: False)
    page = FakePage()
    mouse = SyncHumanMouse(page, lambda _line: None)
    mouse.rng = random.Random(11)
    mouse.x, mouse.y = 100.0, 100.0
    assert mouse.glide(400.0, 300.0, "approach", box={"x": 380, "y": 290, "width": 40, "height": 20})
    assert page.mouse.moves[-1] == (400.0, 300.0)
    times = [s[0] for s in mouse.samples]
    gaps = [round(b - a, 3) for a, b in zip(times, times[1:])]
    assert len(set(gaps)) > 3
    leg = mouse.take()["legs"][0]
    assert leg["kind"] == "approach" and "overshootPx" in leg and "corrections" in leg
