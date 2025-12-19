export const ACHIEVEMENTS = [
    // --- LOGINS (TOTAL) ---
    { id: 'login_tot_1', title: 'Hello World', desc: 'First login', points: 10, type: 'login_total', target: 1 },
    { id: 'login_tot_5', title: 'High Five', desc: 'Login 5 days', points: 20, type: 'login_total', target: 5 },
    { id: 'login_tot_10', title: 'Regular', desc: 'Login 10 days', points: 50, type: 'login_total', target: 10 },
    { id: 'login_tot_25', title: 'Familiar Face', desc: 'Login 25 days', points: 100, type: 'login_total', target: 25 },
    { id: 'login_tot_50', title: 'Committed', desc: 'Login 50 days', points: 200, type: 'login_total', target: 50 },
    { id: 'login_tot_100', title: 'Centurion', desc: 'Login 100 days', points: 500, type: 'login_total', target: 100 },
    { id: 'login_tot_200', title: 'Devoted', desc: 'Login 200 days', points: 1000, type: 'login_total', target: 200 },
    { id: 'login_tot_365', title: 'Yearling', desc: 'Login 365 days', points: 2000, type: 'login_total', target: 365 },

    // --- LOGIN STREAKS ---
    { id: 'streak_3', title: 'Hat Trick', desc: '3 day streak', points: 50, type: 'login_streak', target: 3 },
    { id: 'streak_7', title: 'Week Warrior', desc: '7 day streak', points: 100, type: 'login_streak', target: 7 },
    { id: 'streak_14', title: 'Fortnight', desc: '14 day streak', points: 200, type: 'login_streak', target: 14 },
    { id: 'streak_30', title: 'Monthly Master', desc: '30 day streak', points: 500, type: 'login_streak', target: 30 },
    { id: 'streak_60', title: 'Double Month', desc: '60 day streak', points: 1000, type: 'login_streak', target: 60 },
    { id: 'streak_100', title: 'Century Run', desc: '100 day streak', points: 2000, type: 'login_streak', target: 100 },

    // --- TOTAL SCORE ---
    { id: 'score_100', title: 'Novice', desc: '100 Total Score', points: 10, type: 'score_total', target: 100 },
    { id: 'score_500', title: 'Rookie', desc: '500 Total Score', points: 50, type: 'score_total', target: 500 },
    { id: 'score_1k', title: 'Learner', desc: '1,000 Total Score', points: 100, type: 'score_total', target: 1000 },
    { id: 'score_5k', title: 'Scholar', desc: '5,000 Total Score', points: 250, type: 'score_total', target: 5000 },
    { id: 'score_10k', title: 'Expert', desc: '10,000 Total Score', points: 500, type: 'score_total', target: 10000 },
    { id: 'score_25k', title: 'Master', desc: '25,000 Total Score', points: 1000, type: 'score_total', target: 25000 },
    { id: 'score_50k', title: 'Grandmaster', desc: '50,000 Total Score', points: 2000, type: 'score_total', target: 50000 },
    { id: 'score_100k', title: 'Legend', desc: '100,000 Total Score', points: 5000, type: 'score_total', target: 100000 },
    { id: 'score_1m', title: 'Polyglot God', desc: '1,000,000 Total Score', points: 10000, type: 'score_total', target: 1000000 },

    // --- FLASHCARDS (FLIPS) ---
    { id: 'fc_10', title: 'Flipper', desc: 'Flip 10 cards', points: 10, type: 'flashcard_total', target: 10 },
    { id: 'fc_50', title: 'Shuffler', desc: 'Flip 50 cards', points: 25, type: 'flashcard_total', target: 50 },
    { id: 'fc_100', title: 'Memory Lane', desc: 'Flip 100 cards', points: 50, type: 'flashcard_total', target: 100 },
    { id: 'fc_500', title: 'Stack Overflow', desc: 'Flip 500 cards', points: 200, type: 'flashcard_total', target: 500 },
    { id: 'fc_1k', title: 'Bibliophile', desc: 'Flip 1,000 cards', points: 500, type: 'flashcard_total', target: 1000 },
    { id: 'fc_5k', title: 'Encyclopedia', desc: 'Flip 5,000 cards', points: 1000, type: 'flashcard_total', target: 5000 },
    { id: 'fc_10k', title: 'Akashic Record', desc: 'Flip 10,000 cards', points: 2500, type: 'flashcard_total', target: 10000 },

    // --- QUIZ (WINS) ---
    { id: 'qz_1', title: 'First Guess', desc: 'Win 1 Quiz', points: 10, type: 'quiz_wins', target: 1 },
    { id: 'qz_10', title: 'Trivia Nut', desc: 'Win 10 Quizzes', points: 25, type: 'quiz_wins', target: 10 },
    { id: 'qz_50', title: 'Quiz Whiz', desc: 'Win 50 Quizzes', points: 100, type: 'quiz_wins', target: 50 },
    { id: 'qz_100', title: 'Smarty Pants', desc: 'Win 100 Quizzes', points: 250, type: 'quiz_wins', target: 100 },
    { id: 'qz_500', title: 'Genius', desc: 'Win 500 Quizzes', points: 1000, type: 'quiz_wins', target: 500 },
    { id: 'qz_1k', title: 'Oracle', desc: 'Win 1,000 Quizzes', points: 2000, type: 'quiz_wins', target: 1000 },

    // --- SENTENCES (WINS) ---
    { id: 'st_1', title: 'Builder', desc: 'Build 1 Sentence', points: 10, type: 'sentences_wins', target: 1 },
    { id: 'st_10', title: 'Writer', desc: 'Build 10 Sentences', points: 25, type: 'sentences_wins', target: 10 },
    { id: 'st_50', title: 'Composer', desc: 'Build 50 Sentences', points: 100, type: 'sentences_wins', target: 50 },
    { id: 'st_100', title: 'Novelist', desc: 'Build 100 Sentences', points: 250, type: 'sentences_wins', target: 100 },
    { id: 'st_500', title: 'Wordsmith', desc: 'Build 500 Sentences', points: 1000, type: 'sentences_wins', target: 500 },
    { id: 'st_1k', title: 'Shakespeare', desc: 'Build 1,000 Sentences', points: 2000, type: 'sentences_wins', target: 1000 },

    // --- BLANKS (WINS) ---
    { id: 'bl_1', title: 'Detective', desc: 'Solve 1 Blank', points: 10, type: 'blanks_wins', target: 1 },
    { id: 'bl_10', title: 'Investigator', desc: 'Solve 10 Blanks', points: 25, type: 'blanks_wins', target: 10 },
    { id: 'bl_50', title: 'Sherlock', desc: 'Solve 50 Blanks', points: 100, type: 'blanks_wins', target: 50 },
    { id: 'bl_100', title: 'Mind Reader', desc: 'Solve 100 Blanks', points: 250, type: 'blanks_wins', target: 100 },
    { id: 'bl_500', title: 'Psychic', desc: 'Solve 500 Blanks', points: 1000, type: 'blanks_wins', target: 500 },
    { id: 'bl_1k', title: 'Omniscient', desc: 'Solve 1,000 Blanks', points: 2000, type: 'blanks_wins', target: 1000 },

    // --- GAME STREAKS (In a Row) ---
    { id: 'qz_str_5', title: 'Quiz Hot', desc: '5 Quiz wins in a row', points: 50, type: 'quiz_streak', target: 5 },
    { id: 'qz_str_10', title: 'Quiz Fire', desc: '10 Quiz wins in a row', points: 100, type: 'quiz_streak', target: 10 },
    { id: 'qz_str_20', title: 'Quiz God', desc: '20 Quiz wins in a row', points: 500, type: 'quiz_streak', target: 20 },
    
    { id: 'st_str_5', title: 'Sentence Flow', desc: '5 Sentence wins in a row', points: 50, type: 'sentences_streak', target: 5 },
    { id: 'st_str_10', title: 'Sentence Stream', desc: '10 Sentence wins in a row', points: 100, type: 'sentences_streak', target: 10 },
    
    { id: 'bl_str_5', title: 'Blank Vision', desc: '5 Blank wins in a row', points: 50, type: 'blanks_streak', target: 5 },
    { id: 'bl_str_10', title: 'Blank Sight', desc: '10 Blank wins in a row', points: 100, type: 'blanks_streak', target: 10 },

    // --- TIME SPECIFIC ---
    { id: 'time_early', title: 'Early Bird', desc: 'Score before 6 AM', points: 50, type: 'time_early', target: 1 },
    { id: 'time_lunch', title: 'Lunch Break', desc: 'Score between 12-1 PM', points: 50, type: 'time_lunch', target: 1 },
    { id: 'time_late', title: 'Night Owl', desc: 'Score after 11 PM', points: 50, type: 'time_late', target: 1 },

    // --- DAILY VOLUME ---
    { id: 'day_vol_100', title: 'Good Day', desc: '100 points in one day', points: 20, type: 'daily_score', target: 100 },
    { id: 'day_vol_500', title: 'Great Day', desc: '500 points in one day', points: 100, type: 'daily_score', target: 500 },
    { id: 'day_vol_1k', title: 'Epic Day', desc: '1,000 points in one day', points: 250, type: 'daily_score', target: 1000 },
    { id: 'day_vol_2k', title: 'Insane Day', desc: '2,000 points in one day', points: 500, type: 'daily_score', target: 2000 },

    // --- SPECIAL ---
    { id: 'grand_slam', title: 'Grand Slam', desc: 'Play all 4 modes in one day', points: 200, type: 'daily_variety', target: 4 }
];
