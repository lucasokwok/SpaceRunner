export class HUD {
    constructor() {
        this.scoreElement = document.getElementById('hud-score-value'); // visualizacao do score do hud
        this.livesElement = document.getElementById('hud-lives-value'); // visualizacao das vidas do hud
        this.score = 0 
        this.lives = 3; // 3 vidas iniciais
    }

    updateLives(count) {
        this.lives = count;
        if (this.livesElement) {
            this.livesElement.innerText = count;
            
            if (count <= 1) {
                this.livesElement.parentElement.style.color = "red";
            } else {
                this.livesElement.parentElement.style.color = "white";
            }
        }
    }


    updateScore(points) {
        const newScore = this.score + points;
        if (this.scoreElement) {
            this.scoreElement.innerText = newScore;
        }
    }

   // atualiza as vidas (amount eh quantidade de vidas que perde)
    removeLives(amount) {
        const newLives = Math.max(0, this.lives - amount); // nao fica negativo
        this.updateLives(newLives);
    }
}