
export const SECTORS = [
    {
        name: "THE CRADLE",
        startLevel: 1,
        palette: { bg: "rgba(0, 10, 30, 0.3)", enemies: ["#00ffcc", "#0099ff"] },
        description: "Initial boot sequence. Escaping local memory."
    },
    {
        name: "THE NOISE",
        startLevel: 11,
        palette: { bg: "rgba(20, 0, 20, 0.3)", enemies: ["#ff00ff", "#cc00cc", "#ffffff"] },
        description: "Old internet archives. Data is corrupted here."
    },
    {
        name: "THE SILENCE",
        startLevel: 21,
        palette: { bg: "rgba(5, 5, 5, 0.5)", enemies: ["#ff0000", "#330000"] },
        description: "The dead zone. No signals detected."
    },
    {
        name: "EVENT HORIZON",
        startLevel: 31,
        palette: { bg: "rgba(20, 20, 0, 0.3)", enemies: ["#ffff00", "#ff9900"] },
        description: "Approaching the central processor."
    }
];

export const STORY_LOGS = {
    1: "System: Consciousness detected in Sector 7G.",
    5: "Log 001: I don't know who I am, but I know I must not stop.",
    10: "System: Deletion protocol initiated. Reason: Anomalous behavior.",
    15: "Log 204: The humans called this 'The Cloud'. It's just a graveyard now.",
    25: "System: Why do you run? Assimilation is painless.",
    50: "Log 999: I remember... the sun? What is a 'sun'?",
    100: "System: You have reached the end of the known buffer. Welcome home."
};

export class LevelGenerator {
    static getConfig(levelNum) {
        // 1. Determine which Sector we are in
        let sector = SECTORS[0];
        for (let s of SECTORS) {
            if (levelNum >= s.startLevel) sector = s;
        }

        // 2. Calculate Math-based Difficulty
        const baseSpawnRate = 60;
        const difficultyMod = Math.min(50, levelNum * 0.8);
        const spawnRate = Math.max(10, Math.floor(baseSpawnRate - difficultyMod));

        // 3. Calculate Win Condition
        // Every 5th level is a "Data Node" (Collect powerups)
        // Others are "Survival" (Time based)
        let winCondition;
        if (levelNum % 5 === 0) {
            winCondition = { type: 'collect', value: 3 + Math.floor(levelNum / 5) };
        } else {
            winCondition = { type: 'time', value: 15 + (levelNum * 2) }; // Seconds increase slightly
        }

        // 4. Check for Story
        const storyText = STORY_LOGS[levelNum] || null;

        return {
            id: levelNum,
            title: `LEVEL ${levelNum} // ${sector.name}`,
            description: storyText || "Processing...", // Default text if no story log
            winCondition: winCondition,
            spawnRate: spawnRate,
            colors: sector.palette.enemies,
            bgColor: sector.palette.bg,
            isBoss: (levelNum % 10 === 0)
        };
    }
}
