// Game Definitions with DB Keys
const GAMES = [
    { id: 'fc', type: 'flashcard', name: 'Flashcard', verb: 'Flip', title: 'Reader' },
    { id: 'qz', type: 'quiz', name: 'Quiz', verb: 'Answer', title: 'Guesser' },
    { id: 'st', type: 'sentences', name: 'Sentences', verb: 'Build', title: 'Composer' },
    { id: 'bl', type: 'blanks', name: 'Blanks', verb: 'Solve', title: 'Detective' },
    { id: 'li', type: 'listening', name: 'Listening', verb: 'Hear', title: 'Listener' },
    { id: 'ma', type: 'match', name: 'Match', verb: 'Pair', title: 'Connector' },
    { id: 'me', type: 'memory', name: 'Memory', verb: 'Recall', title: 'Mentalist' },
    { id: 'fi', type: 'finder', name: 'Finder', verb: 'Spot', title: 'Hunter' },
    { id: 'co', type: 'constructor', name: 'Constructor', verb: 'Assemble', title: 'Engineer' },
    { id: 'wr', type: 'writing', name: 'Writing', verb: 'Type', title: 'Scribe' },
    { id: 'tf', type: 'truefalse', name: 'Review', verb: 'Verify', title: 'Judge' },
    { id: 'rv', type: 'reverse', name: 'Reverse', verb: 'Identify', title: 'Analyst' }
];

// Progression Tiers
const STREAK_TIERS = [
    { count: 3, points: 10, suffix: 'Spark' },
    { count: 5, points: 20, suffix: 'Flame' },
    { count: 10, points: 50, suffix: 'Fire' },
    { count: 15, points: 75, suffix: 'Blaze' },
    { count: 20, points: 100, suffix: 'Inferno' },
    { count: 30, points: 150, suffix: 'Nova' },
    { count: 50, points: 250, suffix: 'Supernova' },
    { count: 75, points: 500, suffix: 'Hypernova' },
    { count: 100, points: 1000, suffix: 'Singularity' },
    { count: 200, points: 2000, suffix: 'Eternal' }
];

const VOLUME_TIERS = [
    { count: 1, points: 5, prefix: 'Novice' },
    { count: 10, points: 10, prefix: 'Apprentice' },
    { count: 25, points: 25, prefix: 'Rookie' },
    { count: 50, points: 50, prefix: 'Adept' },
    { count: 100, points: 100, prefix: 'Expert' },
    { count: 250, points: 250, prefix: 'Veteran' },
    { count: 500, points: 500, prefix: 'Elite' },
    { count: 1000, points: 1000, prefix: 'Master' },
    { count: 2500, points: 2500, prefix: 'Grandmaster' },
    { count: 5000, points: 5000, prefix: 'Legend' },
    { count: 10000, points: 10000, prefix: 'Mythic' }
];

const TOTAL_SCORE_TIERS = [
    { score: 100, points: 10, title: 'Beginner' },
    { score: 500, points: 50, title: 'Student' },
    { score: 1000, points: 100, title: 'Scholar' },
    { score: 2500, points: 250, title: 'Academic' },
    { score: 5000, points: 500, title: 'Professor' },
    { score: 10000, points: 1000, title: 'Sage' },
    { score: 25000, points: 2500, title: 'Oracle' },
    { score: 50000, points: 5000, title: 'Prophet' },
    { score: 100000, points: 10000, title: 'Deity' },
    { score: 250000, points: 20000, title: 'Celestial' },
    { score: 500000, points: 30000, title: 'Universal' },
    { score: 1000000, points: 50000, title: 'Omniscient' }
];

const DAILY_TIERS = [
    { score: 100, points: 10, title: 'Warm Up' },
    { score: 300, points: 30, title: 'Getting Serious' },
    { score: 500, points: 50, title: 'On a Roll' },
    { score: 1000, points: 100, title: 'High Octane' },
    { score: 2000, points: 200, title: 'Unstoppable' },
    { score: 3000, points: 300, title: 'Frenzy' },
    { score: 5000, points: 500, title: 'God Mode' },
    { score: 10000, points: 1000, title: 'Limit Break' }
];

const generateAchievements = () => {
    let list = [];

    // 1. Game Specific
    GAMES.forEach(game => {
        STREAK_TIERS.forEach(tier => {
            list.push({
                id: `${game.id}_str_${tier.count}`,
                title: `${game.name} ${tier.suffix}`,
                desc: `${tier.count} ${game.name} wins in a row`,
                points: tier.points,
                category: 'streak',
                gameKey: game.type, // Matches DB key (e.g. 'quiz')
                target: tier.count
            });
        });
        VOLUME_TIERS.forEach(tier => {
            list.push({
                id: `${game.id}_vol_${tier.count}`,
                title: `${tier.prefix} ${game.title}`,
                desc: `${game.verb} ${tier.count} ${game.name} items`,
                points: tier.points,
                category: 'volume',
                gameKey: game.type, // Matches DB key
                target: tier.count
            });
        });
    });

    // 2. Score Specific
    TOTAL_SCORE_TIERS.forEach(tier => {
        list.push({ id: `score_total_${tier.score}`, title: `Rank: ${tier.title}`, desc: `Reach ${tier.score.toLocaleString()} Total Score`, points: tier.points, category: 'score_total', target: tier.score });
    });
    DAILY_TIERS.forEach(tier => {
        list.push({ id: `score_daily_${tier.score}`, title: `Daily: ${tier.title}`, desc: `Score ${tier.score.toLocaleString()} points in one day`, points: tier.points, category: 'score_daily', target: tier.score });
    });

    // 3. Misc
    list.push(
        { id: 'login_1', title: 'Hello World', desc: 'First login', points: 10, category: 'misc' },
        { id: 'time_early', title: 'Early Bird', desc: 'Score points before 6 AM', points: 50, category: 'time', target: 6 },
        { id: 'time_late', title: 'Night Owl', desc: 'Score points after 11 PM', points: 50, category: 'time', target: 23 },
        { id: 'settings_dark', title: 'Dark Side', desc: 'Switch to Dark Mode', points: 5, category: 'misc' },
        { id: 'dict_use', title: 'Curious Mind', desc: 'Open the dictionary', points: 10, category: 'misc' }
    );

    return list;
};

export const ACHIEVEMENTS = generateAchievements();
