import { scoreChartManager } from './ScoreChartManager';
import { achievementManager } from './AchievementManager';
import { settingsManager } from './SettingsManager';

class UIManager {
    init() {
        scoreChartManager.init();
        achievementManager.init();
        settingsManager.init();

        // Fullscreen
        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) fsBtn.addEventListener('click', () => (!document.fullscreenElement) ? document.documentElement.requestFullscreen() : document.exitFullscreen());
    }
}

export const uiManager = new UIManager();
