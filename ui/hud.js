export class HUD {
    constructor() {
        // Elementos do HUD
        this.scoreElement = document.getElementById('hud-score-value');
        this.livesElement = document.getElementById('hud-lives-value');
        this.levelElement = document.getElementById('hud-level-value');
        
        // Valores iniciais
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // Inicializa display
        this.updateScore(0);
        this.updateLives(3);
        this.updateLevel(1);
    }
    
    updateScore(newScore) {
        this.score = newScore;
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score;
        }
    }
    
    addScore(points) {
        this.updateScore(this.score + points);
    }
    
    updateLives(newLives) {
        this.lives = newLives;
        if (this.livesElement) {
            this.livesElement.textContent = this.lives;
        }
    }
    
    loseLife() {
        this.updateLives(Math.max(0, this.lives - 1));
    }
    
    gainLife() {
        this.updateLives(this.lives + 1);
    }
    
    getScore() {
        return this.score;
    }
    
    getLives() {
        return this.lives;
    }
    
    updateLevel(newLevel) {
        this.level = newLevel;
        if (this.levelElement) {
            this.levelElement.textContent = this.level;
        }
    }
    
    getLevel() {
        return this.level;
    }
    
    isGameOver() {
        return this.lives <= 0;
    }
    
    reset() {
        this.updateScore(0);
        this.updateLives(3);
        this.updateLevel(1);
    }
}
