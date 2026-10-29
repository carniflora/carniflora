import { describe, it, expect, vi } from "vitest";
import {
  createBossLevelState,
  spawnBossPlant,
  selectBossLane,
  updateBossLevel,
  atBossPath,
  getDistAtX,
  BOSS_TOTAL,
  ARENA_X,
  OVERRUN_X,
  SCROLL_SPEED,
  getBossOverrunSeconds,
  LANE_Y,
  KINDS,
} from "../src/bossLevel.js";
import { KINDS as BASE_KINDS } from "../src/kinds.js";

function plantAt(x, lane = 0, k = 0, hp = KINDS[k].hp) {
  const s = getDistAtX(x);
  const [px, y] = atBossPath(s, lane);
  return { k, lane, s, x: px, y, hp, cd: 0, slow: 0 };
}

function quietBattle() {
  const state = createBossLevelState();
  state.towers = [];
  state.minions = [];
  return state;
}

function defense(x, lane, hp) {
  const [, y] = atBossPath(getDistAtX(x), lane);
  return {
    type: "tower",
    x,
    y,
    lane,
    hp,
    max: hp,
    r: 16,
    rng: 0,
    dmg: 0,
    cd: 100,
    base: 1,
    slow: 0,
  };
}

describe("Three-lane Harvester breach", () => {
  it("keeps all four shared plants and starts with two tanks and a centre cannon", () => {
    const state = createBossLevelState();
    expect(KINDS).toBe(BASE_KINDS);
    expect(KINDS).toHaveLength(4);
    expect(state.tanks.map((tank) => tank.lane)).toEqual([0, 2]);
    expect(state.towers.find((tower) => tower.type === "cannon").lane).toBe(1);
    expect(state.boss.shielded).toBe(true);
    expect(state.phase).toBe("approach");
  });

  it("clamps path distances and gives each lane its own parallel path", () => {
    expect(getDistAtX(-500)).toBe(0);
    expect(getDistAtX(5000)).toBe(BOSS_TOTAL);
    expect(atBossPath(-100, 0)[0]).toBe(-20);
    expect(atBossPath(BOSS_TOTAL + 100, 2)).toEqual([1840, 400]);
    const s = getDistAtX(900);
    expect(atBossPath(s, 2)[1] - atBossPath(s, 0)[1]).toBeCloseTo(220);
  });

  it("deploys into the selected lane ahead of the mist and deducts spores", () => {
    const state = createBossLevelState();
    expect(selectBossLane(state, 2)).toBe(true);
    expect(spawnBossPlant(state, 0)).toBe(true);
    expect(state.plants[0].lane).toBe(2);
    expect(state.plants[0].y).toBe(LANE_Y[2]);
    expect(state.plants[0].x).toBeGreaterThan(state.leftEdge + 40);
    expect(state.spores).toBe(100);
    expect(state.stats.deployed).toBe(1);
  });

  it("rejects invalid lanes, unknown plants, insufficient spores and terminal deployment", () => {
    const state = createBossLevelState();
    const initial = state.spores;
    for (const lane of [-1, 3, 0.5, NaN]) {
      expect(selectBossLane(state, lane)).toBe(false);
      expect(spawnBossPlant(state, 0, lane)).toBe(false);
    }
    expect(spawnBossPlant(state, 99)).toBe(false);
    expect(state.spores).toBe(initial);
    state.spores = 10;
    expect(spawnBossPlant(state, 0)).toBe(false);
    state.state = "won";
    expect(selectBossLane(state, 1)).toBe(false);
    expect(spawnBossPlant(state, 1)).toBe(false);
    expect(state.plants).toHaveLength(0);
  });

  it("keeps late centre deployments ahead of the mist instead of moving them backward", () => {
    const state = createBossLevelState();
    state.cameraX = ARENA_X;
    state.leftEdge = 1680;
    state.minions = [];
    state.towers.forEach((tower) => {
      tower.cd = 100;
    });
    for (let i = 0; i < 3; i++) expect(spawnBossPlant(state, 0, 1)).toBe(true);
    expect(state.spores).toBe(20);
    const starts = state.plants.map((plant) => plant.s);

    updateBossLevel(state, 1);

    expect(state.plants).toHaveLength(3);
    state.plants.forEach((plant, i) => {
      expect(plant.s).toBeGreaterThanOrEqual(starts[i]);
      expect(plant.x).toBeGreaterThan(state.leftEdge + 40);
      expect(plant.hp).toBe(KINDS[0].hp);
    });
    expect(state.stats.mistLost).toBe(0);
  });

  it("summons late guards ahead of the deployment line with time to intercept them", () => {
    const state = quietBattle();
    state.cameraX = ARENA_X;
    state.leftEdge = 1620;
    state.boss.active = true;
    state.boss.summonCooldown = 0;

    updateBossLevel(state, 0.05);
    expect(state.minions).toHaveLength(1);
    expect(state.minions[0].x).toBeGreaterThan(state.leftEdge + 85);
    updateBossLevel(state, 1);

    expect(state.minions).toHaveLength(1);
    expect(state.minions[0].x).toBeGreaterThan(state.leftEdge + 85);
    expect(state.spores).toBeCloseTo(147.35);
  });

  it("skips reinforcements when no path remains ahead of the deployment line", () => {
    const state = quietBattle();
    state.cameraX = ARENA_X;
    state.leftEdge = 1680;
    state.boss.active = true;
    state.boss.summonCooldown = 0;

    updateBossLevel(state, 1);

    expect(state.minions).toHaveLength(0);
    expect(state.spores).toBeCloseTo(147);
    expect(state.boss.summonCooldown).toBeGreaterThan(0);
  });

  it("preserves the normal reinforcement spawn point before the front reaches it", () => {
    const state = quietBattle();
    state.boss.active = true;
    state.boss.summonCooldown = 0;

    updateBossLevel(state, 0.05);

    expect(state.minions).toHaveLength(1);
    expect(state.minions[0].x).toBe(1680);
  });

  it("keeps attacks within a lane even when adjacent enemies are in weapon range", () => {
    const state = quietBattle();
    state.towers = [defense(300, 1, 100), defense(360, 0, 100)];
    state.plants = [plantAt(300, 0, 1)];
    updateBossLevel(state, 0.05);
    expect(state.towers[0].hp).toBe(100);
    expect(state.towers[1].hp).toBeLessThan(100);
  });

  it("absorbs ordinary hits with armour while Rafflesia blasts pierce it", () => {
    const damage = [];
    for (const k of [0, 1, 2, 3]) {
      const state = quietBattle();
      state.plants = [plantAt(1740, 0, k)];
      const before = state.tanks[0].hp;
      updateBossLevel(state, 0.05);
      damage.push(before - state.tanks[0].hp);
    }
    expect(damage).toEqual([10, 1, 1, 38]);
  });

  it("caps overlapping Pitcher healing at one aura per ally", () => {
    const state = quietBattle();
    const ally = { ...plantAt(300, 0, 1, 20), cd: 100 };
    state.plants = [ally, plantAt(305, 0, 2), plantAt(310, 0, 2)];
    updateBossLevel(state, 0.05);
    expect(ally.hp).toBeCloseTo(20.25);
  });

  it("splashes cannon damage onto nearby plants without hitting distant allies", () => {
    const state = createBossLevelState();
    state.minions = [];
    state.towers = state.towers.filter((tower) => tower.type === "cannon");
    state.plants = [1745, 1730, 1650].map((x) => ({
      ...plantAt(x, 1),
      cd: 100,
    }));
    updateBossLevel(state, 0.05);
    expect(state.plants.map((plant) => plant.hp)).toEqual([134, 140, 150]);
  });

  it("punishes unsupported groups with splash pulses from the exposed core", () => {
    const state = quietBattle();
    state.phase = "core";
    state.tanks.forEach((tank) => {
      tank.hp = 0;
    });
    state.boss.shielded = false;
    state.boss.active = true;
    state.boss.attackCooldown = 0;
    state.plants = [1769, 1777, 1785].map((x) => ({
      ...plantAt(x, 1),
      cd: 100,
    }));
    updateBossLevel(state, 0.05);
    expect(state.plants.map((plant) => plant.hp)).toEqual([140, 140, 132]);
  });

  it("locks herbicide onto the largest group in its damage area", () => {
    const state = quietBattle();
    state.boss.active = true;
    state.boss.sprayCooldown = 0;
    state.plants = [
      plantAt(600, 0),
      plantAt(600, 1),
      plantAt(620, 1),
      plantAt(640, 1),
      plantAt(600, 2),
    ];
    updateBossLevel(state, 0.05);
    expect(state.spray.lane).toBe(1);
    expect(state.spray.timer).toBe(2);
  });

  it("keeps plants attacking the core inside the herbicide damage area", () => {
    const state = quietBattle();
    state.phase = "core";
    state.tanks.forEach((tank) => {
      tank.hp = 0;
    });
    state.boss.shielded = false;
    state.boss.active = true;
    state.boss.attackCooldown = 100;
    state.boss.sprayCooldown = 0;
    state.plants = [{ ...plantAt(1785, 0), cd: 100 }];
    updateBossLevel(state, 0.05);
    expect(state.spray.lane).toBe(0);
    expect(state.spray.x2).toBeGreaterThan(state.plants[0].x);
    updateBossLevel(state, 2.2);
    expect(state.plants[0].hp).toBeLessThan(150);
  });

  it("blocks direct and splash damage to the core while either tank survives", () => {
    const state = quietBattle();
    state.tanks[0].hp = 0;
    state.towers = [defense(1840, 1, 10)];
    state.plants = [plantAt(1800, 1, 3)];
    updateBossLevel(state, 0.05);
    expect(state.towers[0].hp).toBe(0);
    expect(state.boss.hp).toBe(state.boss.maxHp);
    updateBossLevel(state, 2);
    expect(state.boss.hp).toBe(state.boss.maxHp);
    expect(state.boss.shielded).toBe(true);
  });

  it("exposes the core only after both tanks fall and converges surviving flank plants", () => {
    const state = quietBattle();
    const plant = plantAt(1830, 2);
    state.plants = [plant];
    state.tanks[0].hp = 0;
    updateBossLevel(state, 0.05);
    expect(state.boss.shielded).toBe(true);
    state.tanks[1].hp = 0;
    updateBossLevel(state, 0.05);
    expect(state.phase).toBe("core");
    expect(state.boss.shielded).toBe(false);
    expect(state.boss.enraged).toBe(true);
    expect(state.advanceSpeed).toBe(11.25);
    expect(Math.abs(plant.y - state.boss.y)).toBeLessThan(110);
    plant.cd = 0;
    updateBossLevel(state, 0.05);
    expect(state.boss.hp).toBeLessThan(state.boss.maxHp);
  });

  it("leaves the boss dormant during the early garden approach", () => {
    const state = quietBattle();
    updateBossLevel(state, 10);
    expect(state.boss.active).toBe(false);
    expect(state.spray).toBeNull();
    state.plants = [plantAt(1350)];
    updateBossLevel(state, 0.05);
    expect(state.boss.active).toBe(true);
    expect(state.phase).toBe("shields");
  });

  it("gives a full two-second herbicide warning and only burns the marked lane", () => {
    const state = quietBattle();
    state.boss.active = true;
    state.boss.sprayCooldown = 0;
    state.plants = [plantAt(900, 0, 2), plantAt(900, 1, 2)];
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      updateBossLevel(state, 0.05);
      expect(state.spray).toMatchObject({
        lane: 1,
        stage: "warning",
        timer: 2,
      });
      updateBossLevel(state, 1.9);
      expect(state.spray.stage).toBe("warning");
      expect(state.plants.map((p) => p.hp)).toEqual([240, 240]);
      updateBossLevel(state, 0.4);
      expect(state.spray.stage).toBe("firing");
      expect(state.plants[0].hp).toBe(240);
      expect(state.plants[1].hp).toBeLessThan(240);
    } finally {
      random.mockRestore();
    }
  });

  it("recharges herbicide attacks more slowly when the centre cannon is destroyed", () => {
    const online = createBossLevelState();
    const offline = createBossLevelState();
    offline.towers.find((t) => t.type === "cannon").hp = 0;
    for (const state of [online, offline]) {
      state.boss.active = true;
      state.boss.sprayCooldown = 0;
      updateBossLevel(state, 0.05);
    }
    expect(offline.boss.sprayCooldown - online.boss.sprayCooldown).toBe(4);
  });

  it.each([1660, 1680])(
    "skips empty or inverted herbicide zones at mist position %s",
    (leftEdge) => {
      const state = quietBattle();
      state.cameraX = ARENA_X;
      state.leftEdge = leftEdge;
      state.boss.active = true;
      state.boss.sprayCooldown = 0;

      updateBossLevel(state, 0.05);

      expect(state.spray).toBeNull();
      expect(state.boss.sprayCooldown).toBeGreaterThan(0);
    },
  );

  it("still warns about valid herbicide areas near the end of the fight", () => {
    const state = quietBattle();
    state.cameraX = ARENA_X;
    state.leftEdge = 1600;
    state.boss.active = true;
    state.boss.sprayCooldown = 0;

    updateBossLevel(state, 0.05);

    expect(state.spray.stage).toBe("warning");
    expect(state.spray.timer).toBe(2);
    expect(state.spray.x1).toBeLessThan(state.spray.x2);
  });

  it("awards spores for every splash kill once", () => {
    const state = quietBattle();
    state.spores = 0;
    state.towers = [defense(300, 0, 10), defense(320, 0, 10)];
    state.plants = [plantAt(300, 0, 3)];
    updateBossLevel(state, 0.05);
    expect(state.towers.every((tower) => tower.hp === 0)).toBe(true);
    expect(state.spores).toBeCloseTo(50.35);
    updateBossLevel(state, 0.05);
    expect(state.spores).toBeCloseTo(50.7);
  });

  it("does not allow defeated plants to attack or be revived by a Pitcher", () => {
    const state = quietBattle();
    state.towers = [defense(300, 0, 5)];
    state.plants = [plantAt(300, 0, 0, 0), { ...plantAt(310, 0, 2), cd: 100 }];
    updateBossLevel(state, 0.05);
    expect(state.towers[0].hp).toBe(5);
    expect(state.plants).toHaveLength(1);
    expect(state.stats.lost).toBe(1);
  });

  it("counts plants consumed by the mist and permits an empty army to recover", () => {
    const state = quietBattle();
    state.leftEdge = 500;
    state.spores = 0;
    state.plants = [plantAt(200, 0, 0, 1)];
    updateBossLevel(state, 5);
    expect(state.stats.mistLost).toBe(1);
    expect(state.stats.lost).toBe(1);
    expect(state.state).toBe("play");
    expect(spawnBossPlant(state, 1)).toBe(true);
  });

  it("caps regeneration and freezes all simulation timers when paused", () => {
    const state = quietBattle();
    state.spores = 250;
    updateBossLevel(state, 10);
    expect(state.spores).toBe(260);
    state.state = "pause";
    const snapshot = JSON.stringify(state);
    expect(selectBossLane(state, 2)).toBe(true);
    state.selectedLane = 0;
    updateBossLevel(state, 3);
    expect(JSON.stringify(state)).toBe(snapshot);
    for (const dt of [0, -1, NaN, Infinity]) updateBossLevel(state, dt);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("loses at the mist deadline and prioritizes victory in the same frame", () => {
    const lost = quietBattle();
    lost.leftEdge = OVERRUN_X - 0.1;
    updateBossLevel(lost, 1);
    expect(lost.state).toBe("lost");
    expect(lost.leftEdge).toBe(OVERRUN_X);
    const won = quietBattle();
    won.leftEdge = OVERRUN_X - 0.1;
    won.boss.hp = 0;
    updateBossLevel(won, 1);
    expect(won.state).toBe("won");
    expect(won.spray).toBeNull();
    updateBossLevel(won, 1);
    expect(won.shake).toBe(0);
    expect(won.fx).toHaveLength(0);
  });

  it("scrolls steadily without letting leading plants pull the mist off-screen", () => {
    const state = quietBattle();
    state.plants = [plantAt(1830)];
    updateBossLevel(state, 1);
    expect(state.cameraX).toBeCloseTo(SCROLL_SPEED);
    const screenEdge = state.leftEdge + 40 - state.cameraX;
    expect(screenEdge).toBeCloseTo(29);
    expect(state.leftEdge + 85 - state.cameraX).toBeCloseTo(screenEdge + 45);
    state.plants = [];
    updateBossLevel(state, 1);
    expect(state.cameraX).toBeCloseTo(SCROLL_SPEED * 2);
    expect(state.leftEdge + 40 - state.cameraX).toBeCloseTo(38);
  });

  it("keeps the mist moving across the arena after the camera stops", () => {
    const state = quietBattle();
    updateBossLevel(state, ARENA_X / SCROLL_SPEED);
    expect(state.cameraX).toBeCloseTo(ARENA_X);
    expect(state.state).toBe("play");
    const edge = state.leftEdge + 40 - state.cameraX;
    updateBossLevel(state, 2);
    expect(state.cameraX).toBe(ARENA_X);
    expect(state.leftEdge + 40 - state.cameraX).toBeCloseTo(edge + 18);
    expect(state.leftEdge + 85 - state.cameraX).toBeLessThan(960);
  });

  it("lets the moving mist catch slowed plants during the scrolling approach", () => {
    const state = quietBattle();
    spawnBossPlant(state, 3);
    state.plants[0].slow = 10;
    updateBossLevel(state, 5);
    expect(state.plants).toHaveLength(0);
    expect(state.stats.mistLost).toBe(1);
  });

  it("accelerates the visible mist by 25 percent when the core is exposed", () => {
    const state = quietBattle();
    state.cameraX = ARENA_X;
    state.leftEdge = 1100;
    state.tanks.forEach((tank) => {
      tank.hp = 0;
    });
    updateBossLevel(state, 0.05);
    const edge = state.leftEdge;
    updateBossLevel(state, 2);
    expect(state.cameraX).toBe(ARENA_X);
    expect(state.leftEdge - edge).toBeCloseTo(22.5);
  });

  it("counts down to the actual overrun across the scrolling and arena stages", () => {
    const state = quietBattle();
    const initialSeconds = getBossOverrunSeconds(state);
    updateBossLevel(state, 10);
    expect(getBossOverrunSeconds(state)).toBeCloseTo(initialSeconds - 10);
    updateBossLevel(state, 30);
    expect(getBossOverrunSeconds(state)).toBeCloseTo(initialSeconds - 40);
    updateBossLevel(state, getBossOverrunSeconds(state) - 0.1);
    expect(state.state).toBe("play");
    updateBossLevel(state, 0.2);
    expect(state.state).toBe("lost");
    expect(getBossOverrunSeconds(state)).toBe(0);
  });

  it.each([
    {
      name: "supported waves in all three lanes",
      army: [2, 0, 1, 3],
      cannon: true,
      result: "won",
    },
    {
      name: "unsupported Flytrap waves ignoring the cannon",
      army: [0],
      cannon: false,
      result: "lost",
    },
  ])(
    "ends with $result for $name across multiple attack patterns",
    ({ army, cannon, result }) => {
      const random = vi.spyOn(Math, "random");
      try {
        for (const seed of [1, 2, 3, 4, 5]) {
          let value = seed;
          random.mockImplementation(() => {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
          });
          const state = createBossLevelState();
          const laneCounts = [0, 0, 0];
          let deployed = 0;
          for (let tick = 0; tick < 3000 && state.state === "play"; tick++) {
            const targets = state.tanks
              .filter((tank) => tank.hp > 0)
              .map((tank) => tank.lane);
            if (
              cannon &&
              state.towers.some(
                (tower) => tower.type === "cannon" && tower.hp > 0,
              )
            )
              targets.splice(1, 0, 1);
            const lane = targets.length
              ? targets[deployed % targets.length]
              : deployed % 3;
            if (
              tick % 10 === 0 &&
              spawnBossPlant(state, army[laneCounts[lane] % army.length], lane)
            ) {
              deployed++;
              laneCounts[lane]++;
            }
            updateBossLevel(state, 0.05);
          }
          expect(state.state, `battle seed ${seed}`).toBe(result);
          if (result === "won") {
            expect(state.phase).toBe("core");
            expect(state.tanks.every((tank) => tank.hp === 0)).toBe(true);
            expect(state.leftEdge).toBeLessThan(OVERRUN_X);
          } else expect(state.defeatReason).toBe("overrun");
          expect(state.stats.lost).toBeGreaterThan(0);
          expect(state.spores).toBeGreaterThanOrEqual(0);
        }
      } finally {
        random.mockRestore();
      }
    },
  );
});
