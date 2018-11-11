const config = {
    initialPositions: {
        south: {
            X: 272,
            Y: 550
        },
        west: {
            X: -50,
            Y: 272
        },
        north: {
            X: 228,
            Y: -50
        },
        east: {
            X: 550,
            Y: 228
        }
    },
    carLength: 30,
    defaultSpeed: 1,
    middle: 250
};

//TODO zatrzymywanie się samochodu, jeżeli wyczai, że nie ma pierwszeństwa - tylko przypadek jazdy prosto vs skretu w lewo
//TODO view - więcej modeli aut, dopasowane do ustawień etc.
//TODO code refactoring - żeby ładniejszy był

const carStacks = {
    n: [],
    e: [],
    s: [],
    w: []
};
const cars = {};
const stopObservers = {};
const removingObservers = {};
const turnObservers = {};
const stackObservers = {};
const priorityObservers = {};
const lights = {
    sLight: {
        position: 320,
        greenLight: true
    },
    wLight: {
        position: 190,
        greenLight: false
    },
    nLight: {
        position: 200,
        greenLight: true
    },
    eLight: {
        position: 310,
        greenLight: false
    },

};
const lightNodes = {
    sLight: document.getElementById('sLights'),
    wLight: document.getElementById('wLights'),
    nLight: document.getElementById('nLights'),
    eLight: document.getElementById('eLights')
};

let i = 0;
addNewCar();
let demo = setInterval(() => {
    i++;
    if (i % 6 < 4 || i % 6 === 0) {
        addNewCar()
    } else if (i % 6 === 5) {
        for (let key in lights) {
            changeLight(lights[key], lightNodes[key]);
        }
    }
}, 2000);

// avoiding unnecessary computing
document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        clearInterval(demo);
    } else {
        demo = setInterval(() => {
            i++;
            if (i % 6 < 4 || i % 6 === 0) {
                addNewCar()
            } else if (i % 6 === 5) {
                for (let key in lights) {
                    changeLight(lights[key], lightNodes[key]);
                }
            }
        }, 2000);
    }
});

lights.sLight.greenLight ? lightNodes.sLight.children[1].style.backgroundColor = 'green' : lightNodes.sLight.children[0].style.backgroundColor = 'red';
lights.wLight.greenLight ? lightNodes.wLight.children[1].style.backgroundColor = 'green' : lightNodes.wLight.children[0].style.backgroundColor = 'red';
lights.nLight.greenLight ? lightNodes.nLight.children[1].style.backgroundColor = 'green' : lightNodes.nLight.children[0].style.backgroundColor = 'red';
lights.eLight.greenLight ? lightNodes.eLight.children[1].style.backgroundColor = 'green' : lightNodes.eLight.children[0].style.backgroundColor = 'red';

function addNewCar() {
    const name = `car${Date.now()}`;
    let origin = getRandomOrigin();
    let destination = getRandomDirection();

    //avoiding uncomfortable situation I am too lasy to deal with
    carStacks[origin[0]].forEach(carInStack => {
        if (carInStack.destination === 'left') {
            if (carStacks.e.length === 0) {
                origin = 'east';
            } else if (carStacks.n.length === 0) {
                origin = 'north';
            } else if (carStacks.s.length === 0) {
                origin = 'south';
            } else if (carStacks.w.length === 0) {
                origin = 'west';
            }
        }
    });
    carStacks[getOppositeDirection(origin)[0]].forEach(carInStack => {
        if (carInStack.destination === 'left') {
            destination = '';
        }
    });
    if (carStacks[origin[0]].length === 3) {
        origin = getOppositeDirection(origin);
    }

    //empty string for straight
    const newCar = createNewCar(name, origin, 'car1.png');
    newCar.destination = destination;
    carStacks[origin[0]].push(newCar);
    addObservers(newCar, origin);
    cars[newCar.name] = newCar;
    if (origin === 'south') {
        newCar.imgRotate = newCar.direction + 90;
    } else if (origin === 'west') {
        newCar.imgRotate = newCar.direction - 90;
    } else if (origin === 'north') {
        newCar.imgRotate = newCar.direction + 90;
    } else if (origin === 'east') {
        newCar.imgRotate = newCar.direction - 90;
    }
    newCar.carNode.style.transform = `rotate(${newCar.imgRotate}deg)`;
    start(newCar, config.defaultSpeed);
    if (destination) {
        setTimeout(() => {
            prepareToTurn(newCar, destination);
        }, 1200);
    }
}

function changeLight(light, lightNode) {
    if (light.greenLight) {
        lightNode.children[1].style.backgroundColor = '#636363';
        lightNode.children[0].style.backgroundColor = 'red';
    } else {
        lightNode.children[1].style.backgroundColor = 'green';
        lightNode.children[0].style.backgroundColor = '#636363';
        for (let key in cars) {
            const car = cars[key];
            if (car.origin[0] === lightNode.id[0] && !car.lightsPassed) {
                if (!car.enginOn) {
                    startSlow(car, config.defaultSpeed);
                } else {
                    clearInterval(car.stopInterval);
                    const speedDifference = config.defaultSpeed - car.speed;
                    setTimeout(() => {
                        car.accelerate(speedDifference / 3);
                    }, 50);
                    setTimeout(() => {
                        car.accelerate(speedDifference / 3);
                    }, 150);
                    setTimeout(() => {
                        car.accelerate(speedDifference / 3);
                    }, 250);
                }
            }
        }
    }
    light.greenLight = !light.greenLight;
}

function addObservers(car, origin) {
    const light = lights[`${origin[0]}Light`];
    let carPosition;
    let lightPosition;

    //observer for stopping on red light
    stopObservers[car.name] = new MutationObserver(() => {
        switch (car.origin) {
            case 'north':
                carPosition = car.positionY;
                lightPosition = lights.nLight.position;
                break;
            case 'south':
                carPosition = car.positionY;
                lightPosition = lights.sLight.position;
                break;
            case 'east':
                carPosition = car.positionX;
                lightPosition = lights.eLight.position;
                break;
            case 'west':
                carPosition = car.positionX;
                lightPosition = lights.wLight.position;
                break;
        }
        let distanceFromLight = Math.abs(carPosition - lightPosition);
        if (!light.greenLight && distanceFromLight < 100) {
            stop(car, distanceFromLight);
            stopObservers[car.name].disconnect();
        }
        if (distanceFromLight < 5) {
            car.lightsPassed = true;
            stopObservers[car.name].disconnect();
        }
    });

    //observer for removing the car and observers after leaving the area
    removingObservers[car.name] = new MutationObserver(() => {
        if (car.positionX < -60 || car.positionX > 560 || car.positionY < -60 || car.positionY > 560) {
            removingObservers[car.name].disconnect();
            removeCar(car);
        }
    });

    //observer for turning
    if (car.destination) {
        turnObservers[car.name] = new MutationObserver(() => {
            let turningDistance;
            if (car.destination === 'right') {
                turningDistance = 55;
            } else if (car.destination === 'left') {
                turningDistance = 5;
            }
            switch (car.origin) {
                case 'north':
                    carPosition = car.positionY;
                    break;
                case 'south':
                    carPosition = car.positionY;
                    break;
                case 'east':
                    carPosition = car.positionX;
                    break;
                case 'west':
                    carPosition = car.positionX;
                    break;
            }
            if (Math.abs(carPosition - config.middle) < (turningDistance)) {
                turn(car);
                turnObservers[car.name].disconnect();
                if (stackObservers[car.name]) {
                    stackObservers[car.name].disconnect();
                }
            }
        });
    }

    //observer for watching the cars ahead
    const stack = carStacks[car.origin[0]];
    const index = getIndex(stack, car);
    if (index > 0) {
        stackObservers[car.name] = new MutationObserver(() => {
            const observedCar = carStacks[car.origin[0]][index - 1];
            if (observedCar) {
                if (car.origin === 'south') {
                    if (Math.abs(car.positionY - observedCar.positionY) < 120 && car.name !== observedCar.name) {
                        stop(car, 60);
                        stackObservers[car.name].disconnect();
                        if (stopObservers[car.name]) {
                            stopObservers[car.name].disconnect();
                        }
                    }
                } else if (car.origin === 'north') {
                    if (Math.abs(car.positionY - observedCar.positionY) < 120 && car.name !== observedCar.name) {
                        stop(car, 90);
                        stackObservers[car.name].disconnect();
                        if (stopObservers[car.name]) {
                            stopObservers[car.name].disconnect();
                        }
                    }
                } else if (car.origin === 'west' || car.origin === 'east') {
                    if (Math.abs(car.positionX - observedCar.positionX) < 120 && car.name !== observedCar.name) {
                        stop(car, 90);
                        stackObservers[car.name].disconnect();
                        if (stopObservers[car.name]) {
                            stopObservers[car.name].disconnect();
                        }
                    }
                }
            }
        });
    }
}

function createNewCar(name, origin, img) {
    const crossroad = document.getElementById('crossroad');
    const carImgNode = document.createElement('img');
    carImgNode.classList.add('car-img');
    carImgNode.setAttribute('src', `assets/${img}`);

    const rightBlinkerNode = document.createElement('img');
    rightBlinkerNode.classList.add('right-blinker');
    rightBlinkerNode.setAttribute('src', 'assets/blinker.png');

    const leftBlinkerNode = document.createElement('img');
    leftBlinkerNode.classList.add('left-blinker');
    leftBlinkerNode.setAttribute('src', 'assets/blinker.png');

    const carNode = document.createElement('div');
    carNode.classList.add('car');
    carNode.setAttribute('id', name);

    carNode.appendChild(carImgNode);
    carNode.appendChild(rightBlinkerNode);
    carNode.appendChild(leftBlinkerNode);
    crossroad.appendChild(carNode);

    const X = config.initialPositions[origin].X;
    const Y = config.initialPositions[origin].Y;

    carNode.style.left = `${X}px`;
    carNode.style.top = `${Y}px`;

    let direction;

    switch (origin) {
        case 'south':
            direction = 0;
            break;
        case 'west':
            direction = 270;
            break;
        case 'north':
            direction = 180;
            break;
        case 'east':
            direction = 90;
            break;
    }

    return new Car(name, carNode, direction, 0, X, Y, origin);
}

function prepareToTurn(car, direction) {
    car.blinkInterval = blink(car, direction);
    const carSpeed = car.speed;
    const turningTimeout = 1100;
    setTimeout(() => {
        car.break(carSpeed / 6)
    }, turningTimeout);
    setTimeout(() => {
        car.break(carSpeed / 6)
    }, turningTimeout + 200);
    setTimeout(() => {
        car.break(carSpeed / 6);
    }, turningTimeout + 400);
}

function turn(car) {
    delete carStacks[car.origin[0]].map((carInStack, index) => {
        if (carInStack.name === car.name) {
            carStacks[car.origin[0]].splice(index, 1);
        }
    });
    const direction = car.destination;
    let turningInterval;
    const initialDirection = car.direction;
    if (direction === 'right') {
        turningInterval = setInterval(() => {
            car.imgRotate++;
            car.carNode.style.transform = `rotate(${car.imgRotate}deg)`;
            car.direction--;
            if (car.direction < initialDirection - 90) {
                car.direction = initialDirection - 90;
                car.carNode.style.transform = `rotate(${car.imgRotate}deg)`;
                car.speed = config.defaultSpeed;
                clearInterval(turningInterval);
                clearInterval(car.blinkInterval);
                car.carNode.getElementsByClassName(`${direction}-blinker`)[0].style.visibility = 'hidden';
            }
        }, 10);
    } else if (direction === 'left') {
        const oppositeDirection = getOppositeDirection(car.origin);
        let canIGo = true;
        let carWithPriority;
        carStacks[oppositeDirection[0]].forEach(carInStack => {
            const relativePosition = getRelativePosition(carInStack);
            if (carInStack.destination === 'right' || carInStack.destination === '' && relativePosition < 240) {
                canIGo = false;
                carWithPriority = carInStack;
            }
        });
        if (!canIGo) {
            console.log('nie mogie!');
            car.speed = 0;
            priorityObservers[car.name] = addPriorityObserver(car, carWithPriority);
            priorityObservers[car.name].observe(carWithPriority.carNode, {
                attributes: true,
                childList: false,
                subtree: false
            });
        } else if (canIGo) {
            car.speed = config.defaultSpeed / 2;
            if (priorityObservers[car.name]) {
                priorityObservers[car.name].disconnect();
                delete priorityObservers[car.name];
            }
            turningInterval = setInterval(() => {
                car.imgRotate--;
                car.carNode.style.transform = `rotate(${car.imgRotate}deg)`;
                car.direction++;
                if (car.direction > initialDirection + 90) {
                    car.direction = initialDirection + 90;
                    car.carNode.style.transform = `rotate(${car.imgRotate}deg)`;
                    car.speed = config.defaultSpeed;
                    clearInterval(turningInterval);
                    clearInterval(car.blinkInterval);
                    car.carNode.getElementsByClassName(`${direction}-blinker`)[0].style.visibility = 'hidden';
                }
            }, 10);
        }
    }
}

function addPriorityObserver(car, carWithPriority) {
    return new MutationObserver(() => {
        if (carWithPriority.origin === 'south') {
            if (carWithPriority.positionY < (config.middle + 10)) {
                car.speed = config.defaultSpeed / 2;
                turn(car);
                if (priorityObservers[car.name]) {
                    priorityObservers[car.name].disconnect();
                }
            }
        } else if (carWithPriority.origin === 'north') {
            if (carWithPriority.positionY > (config.middle - 10)) {
                turn(car);
                car.speed = config.defaultSpeed / 2;
                if (priorityObservers[car.name]) {
                    priorityObservers[car.name].disconnect();
                }
            }
        } else if (carWithPriority.origin === 'east') {
            if (carWithPriority.positionX < (config.middle + 10)) {
                turn(car);
                car.speed = config.defaultSpeed / 2;
                if (priorityObservers[car.name]) {
                    priorityObservers[car.name].disconnect();
                }
            }
        } else if (carWithPriority.origin === 'west') {
            if (carWithPriority.positionX > (config.middle - 10)) {
                turn(car);
                car.speed = config.defaultSpeed / 2;
                if (priorityObservers[car.name]) {
                    priorityObservers[car.name].disconnect();
                }
            }
        }
    })
}

function blink(car, direction) {
    const blinker = car.carNode.getElementsByClassName(`${direction}-blinker`)[0];
    let blinkerVisibility = false;
    return setInterval(() => {
        if (blinkerVisibility) {
            blinker.style.visibility = 'hidden';
            blinkerVisibility = !blinkerVisibility;
        } else {
            blinker.style.visibility = 'visible';
            blinkerVisibility = !blinkerVisibility;
        }
    }, 200);
}

function stop(car, inDistance) {
    if (car.direction) {
        inDistance -= 30;
    }
    if (inDistance < 25) {
        console.log('hamuje z piskiem opon');
    }
    const speed = car.speed;
    const interval = inDistance / 0.306 / speed;
    car.stopInterval = setInterval(() => {
        if (car.enginOn) {
            car.break(speed / 5);
        } else {
            clearInterval(car.stopInterval);
        }
    }, interval);
}

function start(car, speed) {
    stopObservers[car.name].observe(car.carNode, {attributes: true, childList: false, subtree: false});
    removingObservers[car.name].observe(car.carNode, {attributes: true, childList: false, subtree: false});
    if (car.destination) {
        turnObservers[car.name].observe(car.carNode, {attributes: true, childList: false, subtree: false});
    }
    if (stackObservers[car.name]) {
        stackObservers[car.name].observe(car.carNode, {attributes: true, childList: false, subtree: false});
    }
    if (car.speed === 0) {
        car.go();
        setTimeout(() => {
            car.accelerate(speed / 3);
        }, 50);
        setTimeout(() => {
            car.accelerate(speed / 3);
        }, 150);
        setTimeout(() => {
            car.accelerate(speed / 3);
        }, 250);
    } else {
        console.log('car already running!');
    }
}

function startSlow(car, speed) {
    car.go();
    setTimeout(() => {
        car.accelerate(speed / 6);
    }, 50);
    setTimeout(() => {
        car.accelerate(speed / 6);
    }, 250);
    setTimeout(() => {
        car.accelerate(speed / 6);
    }, 550);
    if (!car.destination) {
        setTimeout(() => {
            car.accelerate(speed / 6);
        }, 2550);
        setTimeout(() => {
            car.accelerate(speed / 6);
        }, 2750);
        setTimeout(() => {
            car.accelerate(speed / 6);
        }, 2950);
    }
}

function getRandomOrigin() {
    const randomNumber = Math.random();
    if (randomNumber < 0.25) {
        return 'south';
    } else if (randomNumber < 0.5) {
        return 'west';
    } else if (randomNumber < 0.75) {
        return 'north';
    } else {
        return 'east';
    }
}

function getIndex(stack, car) {
    let result;
    stack.map((carInStack, index) => {
        if (carInStack.name === car.name) {
            result = index;
            return;
        }
    });
    return result;
}

function getRandomDirection() {
    const randomNumber = Math.random();
    if (randomNumber < 0.33) {
        return 'left';
    } else if (randomNumber < 0.66) {
        return ''
    } else {
        return 'right';
    }
}

function removeCar(car) {
    car.carNode.remove();
    stopObservers[car.name].disconnect();
    delete stopObservers[car.name];
    delete removingObservers[car.name];
    delete turnObservers[car.name];
    delete carStacks[car.origin[0]].map((carInStack, index) => {
        if (carInStack.name === car.name) {
            carStacks[car.origin[0]].splice(index, 1);
        }
    });
    delete cars[car.name];
    delete car;
}

function getOppositeDirection(direction) {
    switch (direction) {
        case 'north':
            return 'south';
        case 'south':
            return 'north';
        case 'west':
            return 'east';
        case 'east':
            return 'west';
    }
}

function getRelativePosition(car) {
    let result;
    switch (car.origin) {
        case 'north':
            result = car.positionY;
            break;
        case 'south':
            result = 500 - car.positionY;
            break;
        case 'east':
            result = 500 - car.positionX;
            break;
        case 'west':
            result = car.positionX;
            break;
    }
    return result;
}