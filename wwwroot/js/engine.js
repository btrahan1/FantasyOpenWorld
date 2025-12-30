window.gameEngine = {
    canvas: null,
    engine: null,
    scene: null,

    initGame: function (canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);

        // --- Physics & Collision Setup ---
        this.scene.gravity = new BABYLON.Vector3(0, -0.9, 0);
        this.scene.collisionsEnabled = true;

        // --- Camera (Third Person) ---
        // Alpha, Beta, Radius, Target
        var camera = new BABYLON.ArcRotateCamera("TPSCamera", 0, Math.PI / 3, 10, BABYLON.Vector3.Zero(), this.scene);
        camera.attachControl(this.canvas, true);
        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 20;
        camera.checkCollisions = true;

        // --- Light ---
        var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        // --- Environment ---
        // Helper for consistent height with Plateau for Fort
        this.calculateTerrainHeight = function (x, z) {
            // Natural Terrain (Waves)
            var y = Math.sin(x * 0.02) * 5 + Math.cos(z * 0.02) * 5;
            y += Math.sin(x * 0.1) * 1 + Math.cos(z * 0.1) * 1;

            // Plateau Logic (For Fort at 0,0)
            var dist = Math.sqrt(x * x + z * z);
            var plateauHeight = 10;
            var plateauRadius = 35; // Flat area
            var blendRadius = 55;   // Slope area

            if (dist < plateauRadius) {
                return plateauHeight;
            } else if (dist < blendRadius) {
                // Smooth Blend (Linear for now, could be cosine)
                var ratio = (dist - plateauRadius) / (blendRadius - plateauRadius); // 0 to 1
                return plateauHeight * (1 - ratio) + y * ratio;
            }

            return y;
        };

        // Atmosphere (Mad Max Fog)
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.005;
        this.scene.fogColor = new BABYLON.Color3(0.7, 0.5, 0.3); // Orange/Brown
        this.scene.clearColor = new BABYLON.Color3(0.8, 0.6, 0.4);

        // Create Desert Terrain (Procedural Dunes) - Large Scale
        var ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 2000, height: 2000, subdivisions: 300, updatable: true }, this.scene);
        ground.checkCollisions = true;

        var sandMaterial = new BABYLON.StandardMaterial("sandMat", this.scene);
        sandMaterial.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/sand.jpg", this.scene);
        sandMaterial.diffuseTexture.uScale = 50;
        sandMaterial.diffuseTexture.vScale = 50;
        sandMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        ground.material = sandMaterial;

        // Deformation (Dunes)
        var positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        for (var idx = 0; idx < positions.length; idx += 3) {
            positions[idx + 1] = this.calculateTerrainHeight(positions[idx], positions[idx + 2]);
        }
        ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        var normals = ground.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        BABYLON.VertexData.ComputeNormals(positions, ground.getIndices(), normals);
        ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        ground.refreshBoundingInfo(); // Fixes collision issues!

        // --- World State ---
        this.activeMobs = [];
        var heroMesh = null;
        var heroLimbs = {}; // Cache for animation
        var animTimer = 0;
        var inputMap = {};

        // --- Input Handling ---
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
            inputMap[evt.sourceEvent.key.toLowerCase()] = true;
        }));
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
            inputMap[evt.sourceEvent.key.toLowerCase()] = false;
        }));

        // Create Fort (On Plateau at height 10)
        FortAssembler.buildFort(this.scene, 0, 0, 10);

        // --- Load Assets ---
        // Mobs
        const spawnMob = (recipeUrl, count, xParams, zParams, namePrefix, hp, scale = 1) => {
            fetch(recipeUrl).then(r => r.json()).then(recipe => {
                for (let i = 0; i < count; i++) {
                    var x = (Math.random() * xParams.range) + xParams.offset;
                    var z = (Math.random() * zParams.range) + zParams.offset;
                    var y = this.calculateTerrainHeight(x, z);
                    var mesh = MobAssembler.createMob(this.scene, recipe, new BABYLON.Vector3(x, y, z), namePrefix + i);
                    if (scale !== 1) mesh.scaling = new BABYLON.Vector3(scale, scale, scale);
                    this.activeMobs.push(new Mob(mesh, namePrefix + i, { hp: hp, maxHp: hp, speed: 0.05, aggroRange: 15 }));
                }
            });
        };

        spawnMob('assets/recipes/goblin_grunt.json', 3, { range: 20, offset: -40 }, { range: 20, offset: 40 }, "grunt_", 10);
        spawnMob('assets/recipes/goblin_warrior.json', 1, { range: 0, offset: 40 }, { range: 0, offset: 40 }, "warrior_", 25, 1.2);
        spawnMob('assets/recipes/orc_warrior.json', 1, { range: 0, offset: -40 }, { range: 0, offset: -40 }, "orc_", 50, 1.5);
        spawnMob('assets/recipes/grey_wolf.json', 3, { range: 20, offset: 50 }, { range: 20, offset: -10 }, "wolf_", 8);

        // Camp
        fetch('assets/recipes/poi_mob_camp.json').then(r => r.json()).then(recipe => {
            var x = 0, z = 20;
            var y = this.calculateTerrainHeight(x, z);
            MobAssembler.createMob(this.scene, recipe, new BABYLON.Vector3(x, y, z), "camp");
        });

        // Hero
        fetch('assets/recipes/human_hero.json').then(r => r.json()).then(recipe => {
            var y = this.calculateTerrainHeight(0, 0);
            heroMesh = MobAssembler.createMob(this.scene, recipe, new BABYLON.Vector3(0, y + 1, 0), "hero");
            // Set camera target
            camera.setTarget(heroMesh);

            // Player Stats
            heroMesh.metadata = { hp: 100, maxHp: 100, damage: 5 };

            // Find Limbs for Animation
            // MobAssembler creates parts as children. We need to find by name (which comes from Part Id)
            // But MobAssembler names: "partId_mobName" or just partId? 
            // Looking at MobAssembler: mesh.name = part.Id + "_" + mobName;
            // So we look for "leg_upper_r_hero", etc.
            heroMesh.getDescendants().forEach(m => {
                if (m.name.includes("leg_upper_r")) heroLimbs.legR = m;
                if (m.name.includes("leg_upper_l")) heroLimbs.legL = m;
                if (m.name.includes("arm_upper_r")) heroLimbs.armR = m;
                if (m.name.includes("arm_upper_l")) heroLimbs.armL = m;
            });
        });

        // --- Attack Logic ---
        var isAttacking = false;
        this.scene.onPointerDown = (evt) => {
            if (evt.button === 0 && heroMesh && !isAttacking) {
                isAttacking = true;

                // Attack Animation (Simple Arm Raise)
                if (heroLimbs.armR) {
                    var originalRot = heroLimbs.armR.rotation.x;
                    heroLimbs.armR.rotation.x -= Math.PI / 2; // Chop down
                    setTimeout(() => { heroLimbs.armR.rotation.x = originalRot; }, 200);
                }

                // Check Hit
                this.activeMobs.forEach(mob => {
                    if (mob.isDead) return;
                    var dist = BABYLON.Vector3.Distance(heroMesh.position, mob.mesh.position);
                    if (dist < 4) { // Increased range slightly
                        var dirToMob = mob.mesh.position.subtract(heroMesh.position).normalize();
                        var heroDir = heroMesh.forward;
                        var angle = BABYLON.Vector3.Dot(dirToMob, heroDir);

                        if (angle > 0.5) {
                            mob.stats.hp -= heroMesh.metadata.damage;
                            console.log("Hit mob! HP: " + mob.stats.hp);
                            mob.mesh.position.addInPlace(dirToMob.scale(1.5)); // Knockback
                            if (mob.stats.hp <= 0) {
                                mob.isDead = true;
                                mob.mesh.dispose();
                            }
                        }
                    }
                });
                setTimeout(() => { isAttacking = false; }, 500);
            }
        };

        // --- Render Loop ---
        this.engine.runRenderLoop(() => {
            if (heroMesh) {
                var heroSpeed = 0.1;
                var moveVector = BABYLON.Vector3.Zero();

                if (inputMap["w"]) moveVector.z = 1;
                if (inputMap["s"]) moveVector.z = -1;
                if (inputMap["a"]) moveVector.x = -1;
                if (inputMap["d"]) moveVector.x = 1;

                var isMoving = false;

                if (moveVector.length() > 0) {
                    isMoving = true;
                    moveVector = moveVector.normalize().scale(heroSpeed);

                    // Camera Relative Movement
                    var forward = camera.position.subtract(heroMesh.position).normalize().scale(-1);
                    forward.y = 0;
                    forward.normalize();
                    var right = BABYLON.Vector3.Cross(forward, new BABYLON.Vector3(0, 1, 0));

                    var finalMove = BABYLON.Vector3.Zero();
                    if (inputMap["w"]) finalMove.addInPlace(forward);
                    if (inputMap["s"]) finalMove.subtractInPlace(forward);
                    if (inputMap["d"]) finalMove.addInPlace(right);
                    if (inputMap["a"]) finalMove.subtractInPlace(right);

                    if (finalMove.length() > 0) {
                        finalMove.normalize().scaleInPlace(heroSpeed);
                        heroMesh.position.addInPlace(finalMove);
                        heroMesh.lookAt(heroMesh.position.add(finalMove));
                    }
                }

                // Animation Logic
                if (isMoving) {
                    animTimer += 0.2;
                    var sin = Math.sin(animTimer);

                    if (heroLimbs.legR) heroLimbs.legR.rotation.x = sin * 0.8;
                    if (heroLimbs.legL) heroLimbs.legL.rotation.x = -sin * 0.8;
                    if (heroLimbs.armR && !isAttacking) heroLimbs.armR.rotation.x = -sin * 0.6; // Don't animate arm if attacking
                    if (heroLimbs.armL) heroLimbs.armL.rotation.x = sin * 0.6;

                    // Bobbing
                    heroMesh.position.y = this.calculateTerrainHeight(heroMesh.position.x, heroMesh.position.z) + 1.0 + Math.abs(Math.sin(animTimer * 2) * 0.05);
                } else {
                    // Idle Pose / Reset
                    var groundY = this.calculateTerrainHeight(heroMesh.position.x, heroMesh.position.z);
                    heroMesh.position.y = groundY + 1.0;

                    if (heroLimbs.legR) heroLimbs.legR.rotation.x = 0;
                    if (heroLimbs.legL) heroLimbs.legL.rotation.x = 0;
                    if (heroLimbs.armR && !isAttacking) heroLimbs.armR.rotation.x = 0;
                    if (heroLimbs.armL) heroLimbs.armL.rotation.x = 0;
                }
            }

            if (this.activeMobs) {
                var mobsData = [];
                var targetMob = null;
                var closestDist = 999;

                this.activeMobs.forEach(mob => {
                    // Update Mobs (Simple ground snap + Chase)
                    if (!mob.isDead) {
                        // Terrain Snap
                        var myY = this.calculateTerrainHeight(mob.mesh.position.x, mob.mesh.position.z);
                        mob.mesh.position.y = myY + 1.0;
                        mob.update(heroMesh);

                        // Radar Data
                        mobsData.push({ x: mob.mesh.position.x, z: mob.mesh.position.z });

                        // Target Selection (Closest in front)
                        var dist = BABYLON.Vector3.Distance(heroMesh.position, mob.mesh.position);
                        if (dist < 20) {
                            // Check look angle
                            var dirToMob = mob.mesh.position.subtract(heroMesh.position).normalize();
                            var heroDir = heroMesh.forward;
                            var angle = BABYLON.Vector3.Dot(dirToMob, heroDir);
                            if (angle > 0.8 && dist < closestDist) {
                                closestDist = dist;
                                targetMob = mob;
                            }
                        }
                    }
                });

                // Update HUD
                if (window.updateHud && heroMesh) {
                    window.updateHud(
                        heroMesh.metadata.hp, heroMesh.metadata.maxHp,
                        targetMob ? targetMob.name : null,
                        targetMob ? targetMob.stats.hp : 0,
                        targetMob ? targetMob.stats.maxHp : 1,
                        mobsData,
                        { x: heroMesh.position.x, z: heroMesh.position.z },
                        heroMesh.rotation.y
                    );
                }
            }
            this.scene.render();
        });

        // Resize event
        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        // Pointer Lock for Mouse Look
        this.canvas.addEventListener("click", () => {
            this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.msRequestPointerLock || this.canvas.mozRequestPointerLock || this.canvas.webkitRequestPointerLock;
            if (this.canvas.requestPointerLock) {
                this.canvas.requestPointerLock();
            }
        });
    }
};
