class Car {
    constructor(name, carNode, direction = 0, speed = 0, positionX = 0, positionY = 0, origin) {
        this.name = name;
        this.direction = direction;
        this.speed = speed;
        this.positionX = positionX;
        this.positionY = positionY;
        this.initialPositionX = positionX;
        this.initialPositionY = positionY;
        this.carNode = carNode;
        this.enginOn = false;
        this.stopInterval = {};
        this.origin = origin;
        this.destination = '';
        this.blinkInterval = {};
        this.lightsPassed = false;
        this.watchForPriority = true;
    }
    // movement
    accelerate(howMuch = 1) {
        if (this.speed === 0) {
            this.enginOn = true;
        }
        if(this.speed < 5) {
            this.speed += howMuch;
        }
    }
    break(howMuch = 1) {
        if (this.speed > howMuch) {
            this.speed -= howMuch;
        } else {
            this.stop();
        }
    }
    go() {
        this.enginOn = true;
        this.movement = setInterval(() => {
            this.positionX += Math.cos((this.direction + 90) / 360 * 2 * Math.PI) * this.speed;
            this.positionY -= Math.sin((this.direction + 90) / 360 * 2 * Math.PI) * this.speed;
            this.carNode.style.left = this.positionX + `px`;
            this.carNode.style.top = this.positionY + `px`;
        }, 10);
    }
    stop() {
        clearInterval(this.movement);
        this.speed = 0;
        this.enginOn = false;
    }
}
