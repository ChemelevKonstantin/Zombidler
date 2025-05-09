// Game state and statistics
const gameState = {
    player: {
        xp: 0,
        level: 1,
        damage: 30,
        fireRate: 1, // shots per second
        xpToNextLevel: 50,
        skillPoints: 0,
        accuracy: 70, // base accuracy 50%
        money: 0 // starting money
    },
    zombies: {
        baseHP: 30,
        baseSpeed: 0.7,
        baseSpawnRate: 2, // zombies per second
        currentWave: 1,
        zombiesKilled: 0
    },
    barricade: {
        maxHp: 100,
        hp: 100
    },
    gameTime: 0,
    isGameRunning: false,
    // gameSpeed: 1.0 // 1.0 = 100% speed
};

// Player mechanics
const playerMechanics = {
    // XP and Leveling
    addXP(amount) {
        gameState.player.xp += amount;
        this.checkLevelUp();
    },

    checkLevelUp() {
        if (gameState.player.xp >= gameState.player.xpToNextLevel) {
            gameState.player.level++;
            gameState.player.xp -= gameState.player.xpToNextLevel;
            gameState.player.xpToNextLevel = Math.floor(gameState.player.xpToNextLevel * 1.4);
            gameState.player.skillPoints += 2;
            return true;
        }
        return false;
    },

    // Upgrade methods
    upgradeDamage() {
        if (gameState.player.skillPoints > 0) {
            gameState.player.damage += 5;
            gameState.player.skillPoints--;
            return true;
        }
        return false;
    },

    upgradeFireRate() {
        if (gameState.player.skillPoints > 0) {
            gameState.player.fireRate += 0.2;
            gameState.player.skillPoints--;
            return true;
        }
        return false;
    },

    upgradeAccuracy() {
        if (gameState.player.skillPoints > 0) {
            gameState.player.accuracy += 5;
            gameState.player.skillPoints--;
            return true;
        }
        return false;
    },

    // Combat calculations
    calculateDamage() {
        return gameState.player.damage;
    },

    getFireRate() {
        return 1000 / gameState.player.fireRate; // returns milliseconds between shots
    },

    calculateBulletSpread() {
        const accuracy = Math.max(50, gameState.player.accuracy); // never below 50
        // Calculate maximum spread angle based on accuracy
        // At 50% accuracy, max spread is 30 degrees
        // At 100% accuracy, max spread is 0 degrees
        const maxSpread = 25 * (1 - (accuracy / 100));
        // Random spread between -maxSpread and +maxSpread
        return (Math.random() * 2 - 1) * maxSpread;
    }
};

// Zombie mechanics
const zombieMechanics = {
    // Wave management
    startNewWave() {
        gameState.zombies.currentWave++;
        this.increaseDifficulty();
    },

    increaseDifficulty() {
        gameState.zombies.baseHP += 5;
        gameState.zombies.baseSpeed += 0;
        gameState.zombies.baseSpawnRate += 0.5;
    },

    // Zombie creation
    createZombie() {
        return {
            hp: this.calculateZombieHP(),
            speed: this.calculateZombieSpeed(),
            damage: 10,
            xpValue: 10
        };
    },

    calculateZombieHP() {
        return gameState.zombies.baseHP + (gameState.zombies.currentWave * 1);
    },

    calculateZombieSpeed() {
        // Do not increase speed with wave; always use baseSpeed
        return Math.min(gameState.zombies.baseSpeed, 1);
    },

    // Combat and rewards
    handleZombieDeath(zombie) {
        gameState.zombies.zombiesKilled++;
        playerMechanics.addXP(zombie.xpValue);
    }
};

// Game loop and time management
const gameLoop = {
    start() {
        if (!gameState.isGameRunning) {
            gameState.isGameRunning = true;
            this.lastUpdate = Date.now();
            this.update();
        }
    },

    stop() {
        gameState.isGameRunning = false;
    },

    update() {
        if (!gameState.isGameRunning) return;

        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = currentTime;

        gameState.gameTime += deltaTime;

        // Check for wave completion
        if (gameState.zombies.zombiesKilled >= gameState.zombies.currentWave * 10) {
            zombieMechanics.startNewWave();
        }

        requestAnimationFrame(() => this.update());
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('.scene');
    const survivor = document.querySelector('.survivor');
    const survivorEmoji = document.querySelector('.survivor-emoji');
    const gun = document.querySelector('.gun');
    const barricade = document.querySelector('.barricade');
    const shotEffects = document.querySelector('.shot-effects');
    const bloodEffects = document.querySelector('.blood-effects');
    // const gameSpeedSlider = document.getElementById('gameSpeed');
    // const gameSpeedValue = gameSpeedSlider.nextElementSibling;
    
    // Stats display elements
    const playerLevel = document.getElementById('playerLevel');
    const playerXP = document.getElementById('playerXP');
    const nextLevelXP = document.getElementById('nextLevelXP');
    const playerDamage = document.getElementById('playerDamage');
    const playerFireRate = document.getElementById('playerFireRate');
    const playerAccuracy = document.getElementById('playerAccuracy');
    const playerMoney = document.getElementById('playerMoney');
    const skillPoints = document.getElementById('skillPoints');
    const currentWave = document.getElementById('currentWave');
    const zombiesKilled = document.getElementById('zombiesKilled');
    const gameTimeDisplay = document.getElementById('gameTime');
    
    // Upgrade buttons
    const upgradeDamageBtn = document.getElementById('upgradeDamage');
    const upgradeFireRateBtn = document.getElementById('upgradeFireRate');
    const upgradeAccuracyBtn = document.getElementById('upgradeAccuracy');
    
    let zombies = [];
    let isShooting = false;
    let zombieSpawnInterval;
    let shootingInterval;
    let movementInterval;
    const BARRICADE_POSITION = 200;
    const SCENE_WIDTH = 800;
    const ZOMBIE_START_POSITION = 700;
    const GUN_POSITION = 100;

    // --- Weapon Inventory ---
    const weaponData = [
        { id: 'gun', img: 'images/gun1.png', name: 'Gun' },
        { id: 'bow', img: 'images/gun2.png', name: 'Shotgun' },
        { id: 'uzi', img: 'images/gun3.png', name: 'Uzi' },
        { id: 'ar', img: 'images/gun4.png', name: 'AR' }
    ];
    let ownedWeapons = ['gun']; // Always start with main gun

    // --- Shop Buttons ---
    const buyBowBtn = document.getElementById('buyBow');
    const buyUziBtn = document.getElementById('buyUzi');
    const buyARBtn = document.getElementById('buyAR');
    const buyFortifyBtn = document.getElementById('buyFortify');

    function updateWeaponDisplay() {
        // Remove old weapon elements except main gun
        const oldWeapons = document.querySelectorAll('.weapon');
        oldWeapons.forEach(el => el.remove());
        // Add each owned weapon above the main gun
        ownedWeapons.forEach((id, idx) => {
            if (id === 'gun') return; // main gun is already present
            const weaponInfo = weaponData.find(w => w.id === id);
            if (!weaponInfo) return;
            const weaponEl = document.createElement('img');
            weaponEl.className = 'weapon';
            weaponEl.src = weaponInfo.img;
            weaponEl.alt = weaponInfo.name;
            weaponEl.style.width = '50px';
            weaponEl.style.height = '50px';
            weaponEl.style.display = 'block';
            weaponEl.style.bottom = `${10 + idx * 35}px`;
            weaponEl.style.filter = 'drop-shadow(2px 4px 6px rgba(0,0,0,0.5))';
            weaponEl.style.left = '-20px';
            weaponEl.style.transform = 'scaleX(1)';
            survivor.appendChild(weaponEl);
        });
    }

    function updateShopButtons() {
        if (ownedWeapons.includes('bow')) {
            buyBowBtn.disabled = true;
            buyBowBtn.innerHTML = '✅OWNED';
        } else {
            buyBowBtn.disabled = gameState.player.money < 10;
            buyBowBtn.innerHTML = 'Buy Shotgun <img src="images/gun2.png" alt="Shotgun" style="width:25px;height:25px;vertical-align:middle;margin-left:2px;filter:brightness(0) saturate(100%) drop-shadow(0 0 8px #ffcc00);"> (10💵)';
        }
        if (ownedWeapons.includes('uzi')) {
            buyUziBtn.disabled = true;
            buyUziBtn.innerHTML = '✅OWNED';
        } else {
            buyUziBtn.disabled = gameState.player.money < 50;
            buyUziBtn.innerHTML = 'Buy Uzi <img src="images/gun3.png" alt="Uzi" style="width:25px;height:25px;vertical-align:middle;margin-left:2px;filter:brightness(0) saturate(100%) drop-shadow(0 0 8px #00eaff);"> (50💵)';
        }
        if (ownedWeapons.includes('ar')) {
            buyARBtn.disabled = true;
            buyARBtn.innerHTML = '✅OWNED';
        } else {
            buyARBtn.disabled = gameState.player.money < 100;
            buyARBtn.innerHTML = 'Buy MG <img src="images/gun4.png" alt="MG" style="width:25px;height:25px;vertical-align:middle;margin-left:2px;filter:brightness(0) saturate(100%) drop-shadow(0 0 8px #ff4444);"> (100💵)';
        }
        // Fortify: never sold out, only disabled if not enough money
        buyFortifyBtn.disabled = gameState.player.money < 10;
    }

    function tryBuyWeapon(id, cost) {
        if (ownedWeapons.includes(id)) return;
        if (gameState.player.money >= cost) {
            gameState.player.money -= cost;
            ownedWeapons.push(id);
            updateStatsDisplay();
            updateWeaponDisplay();
            updateShopButtons();
        }
    }

    buyBowBtn.addEventListener('click', () => tryBuyWeapon('bow', 10));
    buyUziBtn.addEventListener('click', () => tryBuyWeapon('uzi', 20));
    buyARBtn.addEventListener('click', () => tryBuyWeapon('ar', 50));
    buyFortifyBtn.addEventListener('click', () => {
        if (gameState.player.money >= 10) {
            gameState.player.money -= 10;
            gameState.barricade.hp = Math.min(gameState.barricade.hp + 10, gameState.barricade.maxHp);
            updateStatsDisplay();
            updateBarricadeHPBar();
            updateShopButtons();
        }
    });

    // Initial weapon display and shop button state
    updateWeaponDisplay();
    updateShopButtons();

    // --- Multi-Weapon Shooting ---
    function shoot() {
        if (!isShooting && zombies.length > 0) {
            isShooting = true;
            // Find the closest zombie to the barricade
            const targetZombie = zombies.reduce((closest, current) => {
                const closestLeft = parseInt(getComputedStyle(closest).left);
                const currentLeft = parseInt(getComputedStyle(current).left);
                return currentLeft < closestLeft ? current : closest;
            });
            // For each owned weapon, shoot in sequence with delay
            ownedWeapons.forEach((id, idx) => {
                setTimeout(() => {
                    // Main gun uses the existing gun element
                    let gunEl = gun;
                    if (id !== 'gun') {
                        // Find the corresponding .weapon element
                        const weaponEls = document.querySelectorAll('.weapon');
                        gunEl = weaponEls[idx - 1]; // idx-1 because main gun is not in .weapon
                    }
                    // Trigger gun recoil animation
                    if (gunEl) {
                        gunEl.style.animation = 'none';
                        gunEl.offsetHeight;
                        gunEl.style.animation = 'gunRecoil 0.2s ease-out';
                    }
                    // Create muzzle flash
                    createMuzzleFlash();
                    // Create and animate bullet
                    const bullet = createBullet();
                    animateBullet(bullet, targetZombie);
                }, idx * 100); // 100ms delay between each weapon
            });
            setTimeout(() => {
                isShooting = false;
            }, playerMechanics.getFireRate() + (ownedWeapons.length - 1) * 100);
        }
    }

    // Update stats display
    function updateStatsDisplay() {
        playerLevel.textContent = gameState.player.level;
        playerXP.textContent = gameState.player.xp;
        nextLevelXP.textContent = gameState.player.xpToNextLevel;
        playerDamage.textContent = gameState.player.damage;
        playerFireRate.textContent = gameState.player.fireRate.toFixed(1);
        playerAccuracy.textContent = gameState.player.accuracy;
        playerMoney.textContent = gameState.player.money;
        skillPoints.textContent = gameState.player.skillPoints;
        currentWave.textContent = gameState.zombies.currentWave;
        zombiesKilled.textContent = gameState.zombies.zombiesKilled;
        gameTimeDisplay.textContent = Math.floor(gameState.gameTime);
        
        // Update button states
        upgradeDamageBtn.disabled = gameState.player.skillPoints <= 0;
        upgradeFireRateBtn.disabled = gameState.player.skillPoints <= 0;
        if (gameState.player.accuracy >= 100) {
            upgradeAccuracyBtn.disabled = true;
            upgradeAccuracyBtn.textContent = '🔥MAX Accuracy🔥';
        } else {
            upgradeAccuracyBtn.disabled = gameState.player.skillPoints <= 0;
            upgradeAccuracyBtn.textContent = 'Accuracy +5% (1 SP)';
        }
    }

    // Update intervals when game speed changes
    function updateIntervals() {
        clearInterval(zombieSpawnInterval);
        clearInterval(shootingInterval);
        // movementInterval is not used anymore
        // Make spawn interval faster as wave increases (fixed, not affected by game speed)
        const spawnInterval = Math.max(900, 3000 / (1 + (gameState.zombies.currentWave - 1) * 0.25));
        zombieSpawnInterval = setInterval(() => {
            if (zombies.length < 3) {
                const newZombie = createZombie();
                if (!newZombie) {
                    setTimeout(() => {
                        if (zombies.length < 3) {
                            createZombie();
                        }
                    }, 1000);
                }
            }
        }, spawnInterval);
        shootingInterval = setInterval(shoot, playerMechanics.getFireRate());
    }

    // Call updateIntervals at game start
    updateIntervals();

    // Add event listeners for upgrade buttons
    upgradeDamageBtn.addEventListener('click', () => {
        if (playerMechanics.upgradeDamage()) {
            updateStatsDisplay();
        }
    });

    upgradeFireRateBtn.addEventListener('click', () => {
        if (playerMechanics.upgradeFireRate()) {
            updateStatsDisplay();
            updateIntervals();
        }
    });

    upgradeAccuracyBtn.addEventListener('click', () => {
        if (playerMechanics.upgradeAccuracy()) {
            updateStatsDisplay();
        }
    });

    // Set random survivor image
    const survivorImages = [
        'images/char1.png',
        'images/char2.png',
        'images/char3.png',
        'images/char4.png',
        'images/char5.png',
        'images/char6.png',
        'images/char7.png',
        'images/char8.png'
    ];
    const chosenImage = survivorImages[Math.floor(Math.random() * survivorImages.length)];
    survivorEmoji.innerHTML = `<img src="${chosenImage}" alt="Survivor" style="width:60px;height:80px;object-fit:contain;">`;
    
    // Function to create blood splash
    function createBloodSplash(x, y) {
        const bloodEmojis = ['🩸', '❤️', '🥩'];
        const splash = document.createElement('div');
        splash.className = 'blood-splash';
        splash.textContent = bloodEmojis[Math.floor(Math.random() * bloodEmojis.length)];
        splash.style.left = `${x}px`;
        splash.style.bottom = `${y}px`;
        bloodEffects.appendChild(splash);
        setTimeout(() => splash.remove(), 500);
    }

    // Function to update zombie HP bar
    function updateZombieHPBar(zombie) {
        const currentHP = parseInt(zombie.dataset.hp);
        const maxHP = parseInt(zombie.dataset.maxHp);
        const hpPercentage = (currentHP / maxHP) * 100;
        const hpBarFill = zombie.querySelector('.zombie-hp-bar-fill');
        hpBarFill.style.width = `${hpPercentage}%`;
    }

    // Function to create muzzle flash
    function createMuzzleFlash() {
        const flash = document.createElement('div');
        flash.className = 'muzzle-flash';
        flash.textContent = '✨';
        flash.style.left = `${GUN_POSITION + 25}px`;
        flash.style.bottom = '70px';
        shotEffects.appendChild(flash);
        setTimeout(() => flash.remove(), 100);
    }

    // Function to create bullet trail
    function createBulletTrail(x, y) {
        const trail = document.createElement('div');
        trail.className = 'bullet-trail';
        trail.style.left = `${x}px`;
        trail.style.bottom = `${y}px`;
        shotEffects.appendChild(trail);
        setTimeout(() => trail.remove(), 200);
    }

    // Function to create a new bullet
    function createBullet() {
        const bullet = document.createElement('div');
        bullet.className = 'bullet';
        bullet.textContent = '💥';
        bullet.style.left = `${GUN_POSITION + 25}px`;
        bullet.style.bottom = '70px';
        scene.appendChild(bullet);
        return bullet;
    }

    // Function to create money drop effect
    function createMoneyDrop(x, y, amount) {
        const moneyDrop = document.createElement('div');
        moneyDrop.className = 'money-drop';
        moneyDrop.textContent = '💵';
        moneyDrop.style.position = 'absolute';
        moneyDrop.style.left = `${x}px`;
        moneyDrop.style.bottom = `${y}px`;
        moneyDrop.style.fontSize = '24px';
        moneyDrop.style.zIndex = '40';
        moneyDrop.style.animation = 'moneyFloat 1s ease-out';
        scene.appendChild(moneyDrop);
        
        // Show amount
        const amountText = document.createElement('div');
        amountText.textContent = `+${amount}`;
        amountText.style.position = 'absolute';
        amountText.style.left = `${x + 20}px`;
        amountText.style.bottom = `${y + 20}px`;
        amountText.style.color = '#ffd700';
        amountText.style.fontWeight = 'bold';
        amountText.style.zIndex = '4';
        amountText.style.animation = 'moneyFloat 1s ease-out';
        scene.appendChild(amountText);
        
        // Remove after animation
        setTimeout(() => {
            moneyDrop.remove();
            amountText.remove();
        }, 1000);
    }

    // Function to animate bullet
    function animateBullet(bullet, targetZombie) {
        let position = GUN_POSITION;
        const bulletSpeed = 10;
        const spreadAngle = playerMechanics.calculateBulletSpread();
        let verticalOffset = 0;
        
        const interval = setInterval(() => {
            position += bulletSpeed;
            // Calculate vertical offset based on spread angle
            verticalOffset += Math.tan(spreadAngle * Math.PI / 180) * bulletSpeed;
            
            bullet.style.left = `${position}px`;
            bullet.style.bottom = `${70 + verticalOffset}px`;
            
            createBulletTrail(position, 70 + verticalOffset);
            
            const zombieLeft = parseInt(getComputedStyle(targetZombie).left);
            const zombieBottom = parseInt(getComputedStyle(targetZombie).bottom);
            const bulletBottom = parseInt(getComputedStyle(bullet).bottom);
            
            // Check if bullet hits zombie (with more generous tolerance)
            if (position >= zombieLeft - 20 && position <= zombieLeft + 20 && 
                Math.abs(bulletBottom - zombieBottom) < 50) {
                clearInterval(interval);
                bullet.remove();
                
                // Apply damage to zombie
                const currentHP = parseInt(targetZombie.dataset.hp);
                const damage = playerMechanics.calculateDamage();
                const newHP = currentHP - damage;
                targetZombie.dataset.hp = newHP;
                updateZombieHPBar(targetZombie);

                // Show damage indicator (blood splash style, always visible)
                const zombieRect = targetZombie.getBoundingClientRect();
                const sceneRect = scene.getBoundingClientRect();
                const relativeX = zombieRect.left - sceneRect.left;
                const relativeY = sceneRect.bottom - zombieRect.bottom;
                const damageIndicator = document.createElement('div');
                damageIndicator.className = 'damage-indicator';
                damageIndicator.textContent = `${damage}`;
                damageIndicator.style.position = 'absolute';
                damageIndicator.style.left = `${relativeX + zombieRect.width / 2}px`;
                damageIndicator.style.bottom = `${relativeY + zombieRect.height - 10}px`;
                damageIndicator.style.zIndex = '9999';
                bloodEffects.appendChild(damageIndicator);
                setTimeout(() => damageIndicator.remove(), 800);
                
                if (newHP <= 0) {
                    const zombieRect = targetZombie.getBoundingClientRect();
                    const sceneRect = scene.getBoundingClientRect();
                    const relativeX = zombieRect.left - sceneRect.left;
                    const relativeY = sceneRect.bottom - zombieRect.bottom;
                    
                    createBloodSplash(relativeX, relativeY);
                    createBloodSplash(relativeX + 20, relativeY + 10);
                    createBloodSplash(relativeX - 20, relativeY + 15);
                    
                    // Random money drop (30% chance)
                    if (Math.random() < 0.3) {
                        const moneyAmount = Math.floor(Math.random() * 10) + 1; // Random amount between 1-10
                        gameState.player.money += moneyAmount;
                        createMoneyDrop(relativeX, relativeY, moneyAmount);
                        updateShopButtons();
                    }
                    
                    zombieMechanics.handleZombieDeath({ xpValue: 10 });
                    targetZombie.remove();
                    zombies = zombies.filter(z => z !== targetZombie);
                    updateStatsDisplay();
                }
            } else if (position > SCENE_WIDTH) {
                // Remove bullet if it goes off screen
                clearInterval(interval);
                bullet.remove();
            }
        }, 20);
    }

    // --- Optimized Zombie Movement ---
    let lastMoveTime = 0;
    function moveZombiesOptimized(now) {
        if (!gameState.isGameRunning) return;
        // Throttle to 60fps
        if (now - lastMoveTime < 16) {
            requestAnimationFrame(moveZombiesOptimized);
            return;
        }
        lastMoveTime = now;
        // Batch DOM reads
        const zombieStates = zombies.map(zombie => {
            return {
                el: zombie,
                left: parseInt(zombie.style.left),
                bottom: parseInt(zombie.style.bottom),
                speed: parseFloat(zombie.dataset.speed),
                verticalOffset: parseFloat(zombie.dataset.verticalOffset),
                targetVerticalPosition: parseInt(zombie.dataset.verticalPosition),
                lastDamageTime: zombie.lastDamageTime || 0
            };
        });
        const time = now / 1000;
        zombieStates.forEach(state => {
            if (state.left > BARRICADE_POSITION + 60) {
                // Move zombie towards barricade
                const newPosition = state.left - state.speed;
                const verticalMovement = Math.sin(time * 2) * state.verticalOffset;
                const newBottom = state.targetVerticalPosition + verticalMovement;
                state.el.style.left = `${newPosition}px`;
                state.el.style.bottom = `${newBottom}px`;
                state.el.classList.remove('attacking');
            } else {
                state.el.classList.add('attacking');
                state.el.style.bottom = `${state.targetVerticalPosition}px`;
                state.el.style.transform = 'translateY(0)';
                // Shake barricades more frequently when zombies are attacking
                if (Math.random() < 0.1) {
                    const barricades = document.querySelectorAll('.barricade');
                    barricades.forEach(barricade => {
                        const scale = barricade.classList.contains('top-barricade') ? 0.8 : 
                            barricade.classList.contains('bottom-barricade') ? 1.2 : 1;
                        const rotate = barricade.classList.contains('top-barricade') ? -4 :
                            barricade.classList.contains('bottom-barricade') ? 8 : 0;
                        barricade.style.setProperty('--original-scale', scale);
                        barricade.style.setProperty('--original-rotate', `${rotate}deg`);
                        barricade.style.animation = 'none';
                        barricade.offsetHeight;
                        barricade.style.animation = 'barricadeShake 0.5s cubic-bezier(.36,.07,.19,.97)';
                    });
                }
                // --- Barricade takes damage over time ---
                if (!state.el.lastDamageTime) state.el.lastDamageTime = 0;
                if (now - state.el.lastDamageTime > 1000) {
                    gameState.barricade.hp -= 10;
                    updateBarricadeHPBar();
                    state.el.lastDamageTime = now;
                    if (gameState.barricade.hp <= 0) {
                        gameOver();
                    }
                }
            }
        });
        requestAnimationFrame(moveZombiesOptimized);
    }

    // Remove any existing zombies from the HTML
    const existingZombies = document.querySelectorAll('.zombie');
    existingZombies.forEach(zombie => zombie.remove());

    // Function to create a new zombie
    function createZombie() {
        const existingZombieAtStart = zombies.some(zombie => {
            const left = parseInt(getComputedStyle(zombie).left);
            return Math.abs(left - ZOMBIE_START_POSITION) < 50;
        });

        if (existingZombieAtStart) {
            return null;
        }

        const zombieData = zombieMechanics.createZombie();
        // Replace emoji with image for zombies
        const zombieImages = [
            'images/z1.png',
            'images/z2.png',
            'images/z3.png',
            'images/z4.png',
            'images/z5.png',
            'images/z6.png',
            'images/z7.png'
        ];
        const zombie = document.createElement('div');
        zombie.className = 'zombie';
        const chosenZombieImage = zombieImages[Math.floor(Math.random() * zombieImages.length)];
        zombie.innerHTML = `<img src="${chosenZombieImage}" alt="Zombie" style="width:60px;height:80px;object-fit:contain;">`;
        zombie.style.left = `${ZOMBIE_START_POSITION}px`;
        
        // Random vertical position between 20px and 120px from bottom
        const randomVerticalPosition = Math.floor(Math.random() * 100) + 20;
        zombie.style.bottom = `${randomVerticalPosition}px`;
        zombie.dataset.verticalPosition = randomVerticalPosition;
        
        zombie.dataset.speed = zombieData.speed.toFixed(2);
        zombie.dataset.hp = zombieData.hp;
        zombie.dataset.maxHp = zombieData.hp;
        zombie.dataset.verticalOffset = (Math.random() * 10).toFixed(2);

        // Create HP bar
        const hpBar = document.createElement('div');
        hpBar.className = 'zombie-hp-bar';
        const hpBarFill = document.createElement('div');
        hpBarFill.className = 'zombie-hp-bar-fill';
        hpBarFill.style.width = '100%';
        hpBar.appendChild(hpBarFill);
        zombie.appendChild(hpBar);

        scene.appendChild(zombie);
        zombies.push(zombie);
        return zombie;
    }

    // Replace movementInterval with optimized loop
    // movementInterval = setInterval(moveZombies, 50);
    requestAnimationFrame(moveZombiesOptimized);

    // Start game loop
    gameLoop.start();

    // Update stats display every second
    setInterval(updateStatsDisplay, 1000);

    // Create barricade health bar
    const barricadeHealthBar = document.createElement('div');
    barricadeHealthBar.className = 'barricade-hp-bar';
    const barricadeHealthBarFill = document.createElement('div');
    barricadeHealthBarFill.className = 'barricade-hp-bar-fill';
    barricadeHealthBarFill.style.width = '100%';
    const barricadeHealthText = document.createElement('span');
    barricadeHealthText.className = 'barricade-hp-text';
    barricadeHealthText.style.position = 'absolute';
    barricadeHealthText.style.left = '50%';
    barricadeHealthText.style.top = '50%';
    barricadeHealthText.style.transform = 'translate(-50%, -50%)';
    barricadeHealthText.style.color = '#fff';
    barricadeHealthText.style.fontWeight = 'bold';
    barricadeHealthText.style.textShadow = '0 0 4px #000, 0 0 2px #fff';
    barricadeHealthText.style.fontSize = '10px';
    barricadeHealthBar.appendChild(barricadeHealthBarFill);
    barricadeHealthBar.appendChild(barricadeHealthText);
    barricade.parentNode.insertBefore(barricadeHealthBar, barricade);

    function updateBarricadeHPBar() {
        const percent = (gameState.barricade.hp / gameState.barricade.maxHp) * 100;
        barricadeHealthBarFill.style.width = percent + '%';
        barricadeHealthText.textContent = `${gameState.barricade.hp} / ${gameState.barricade.maxHp}`;
    }
    updateBarricadeHPBar();

    function cleanupGameScene() {
        // Remove all zombies from DOM and array
        const allZombies = document.querySelectorAll('.zombie');
        allZombies.forEach(z => z.remove());
        zombies = [];
        // Remove all bullets
        const allBullets = document.querySelectorAll('.bullet');
        allBullets.forEach(b => b.remove());
        // Remove all blood splashes
        const allBlood = document.querySelectorAll('.blood-splash');
        allBlood.forEach(b => b.remove());
        // Remove all damage indicators
        const allDamage = document.querySelectorAll('.damage-indicator');
        allDamage.forEach(d => d.remove());
        // Remove all money drops
        const allMoney = document.querySelectorAll('.money-drop');
        allMoney.forEach(m => m.remove());
        // Remove all money amount texts
        const allMoneyText = Array.from(document.querySelectorAll('.scene > div')).filter(el => el.textContent && el.textContent.match(/^\+\d+$/));
        allMoneyText.forEach(m => m.remove());
    }

    function gameOver() {
        gameState.isGameRunning = false;
        clearInterval(zombieSpawnInterval);
        clearInterval(shootingInterval);
        clearInterval(movementInterval);
        cleanupGameScene();
        // Show overlay
        let overlay = document.getElementById('gameOverOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gameOverOverlay';
            overlay.style.position = 'fixed';
            overlay.style.top = 0;
            overlay.style.left = 0;
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.background = 'rgba(0, 0, 0, 0)'; // Start transparent
            overlay.style.transition = 'background 1.7s';
            overlay.style.color = '#fff';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.fontSize = '48px';
            overlay.style.zIndex = 99999;
            overlay.innerHTML = '<div style="color:#ff2222;font-weight:900;">GAME OVER</div>' +
                '<div style="color:#ff2222;font-weight:900;font-size:24px;margin-top:20px;">The barricade fell.<br>You\'re eaten alive.</div>';
            document.body.appendChild(overlay);
            setTimeout(() => {
                overlay.style.background = 'rgba(0, 0, 0, 0.85)';
            }, 10);
        }
    }

    // Add boss zombie creation
    function createBossZombie() {
        const zombieData = {
            hp: gameState.zombies.baseHP * 5 + (gameState.zombies.currentWave * 5),
            speed: gameState.zombies.baseSpeed * 0.7,// + (gameState.zombies.currentWave * 0.05),
            damage: 10,
            xpValue: 50
        };
        const bossZombie = document.createElement('div');
        bossZombie.className = 'zombie boss-zombie';
        // Replace emoji with image for boss zombies
        const bossZombieImages = [
            'images/z1.png',
            'images/z2.png',
            'images/z3.png',
            'images/z4.png',
            'images/z5.png',
            'images/z6.png',
            'images/z7.png'
        ];
        const chosenBossZombieImage = bossZombieImages[Math.floor(Math.random() * bossZombieImages.length)];
        bossZombie.innerHTML = `<img src="${chosenBossZombieImage}" alt="Boss Zombie" style="width:80px;height:100px;object-fit:contain;">`;
        bossZombie.style.left = `${ZOMBIE_START_POSITION}px`;
        // Random vertical position between 20px and 120px from bottom
        const randomVerticalPosition = Math.floor(Math.random() * 100) + 20;
        bossZombie.style.bottom = `${randomVerticalPosition}px`;
        bossZombie.dataset.verticalPosition = randomVerticalPosition;
        bossZombie.dataset.speed = zombieData.speed.toFixed(2);
        bossZombie.dataset.hp = zombieData.hp;
        bossZombie.dataset.maxHp = zombieData.hp;
        bossZombie.dataset.verticalOffset = (Math.random() * 10).toFixed(2);
        // Randomize size and glow
        const fontSize = Math.floor(Math.random() * 31) + 70; // 70px to 100px
        bossZombie.style.fontSize = fontSize + 'px';
        const glowColors = ['#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff8800', '#00ff88', '#8888ff'];
        const glow = glowColors[Math.floor(Math.random() * glowColors.length)];
        bossZombie.style.textShadow = `0 0 24px ${glow}, 0 0 8px #000`;
        // Create HP bar
        const hpBar = document.createElement('div');
        hpBar.className = 'zombie-hp-bar';
        const hpBarFill = document.createElement('div');
        hpBarFill.className = 'zombie-hp-bar-fill';
        hpBarFill.style.width = '100%';
        hpBar.appendChild(hpBarFill);
        bossZombie.appendChild(hpBar);
        scene.appendChild(bossZombie);
        zombies.push(bossZombie);
        return bossZombie;
    }

    // Modify wave logic to spawn boss on every third wave
    const originalStartNewWave = zombieMechanics.startNewWave;
    zombieMechanics.startNewWave = function() {
        gameState.zombies.currentWave++;
        this.increaseDifficulty();
        if (gameState.zombies.currentWave % 3 === 0) {
            createBossZombie();
        }
    };
}); 