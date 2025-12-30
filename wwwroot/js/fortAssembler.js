var FortAssembler = {
    materials: {},

    init: function (scene) {
        // Create shared materials
        var stoneMat = new BABYLON.StandardMaterial("stoneMat", scene);
        stoneMat.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/floor.png", scene);
        stoneMat.diffuseTexture.uScale = 5;
        stoneMat.diffuseTexture.vScale = 5;
        stoneMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        this.materials.stone = stoneMat;

        var woodMat = new BABYLON.StandardMaterial("woodMat", scene);
        woodMat.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/wood.jpg", scene);
        this.materials.wood = woodMat;
    },

    createTechnique: function (scene, x, z) {
        // Just a wrapper for the full fort build
        this.buildFort(scene, x, z);
    },

    buildFort: function (scene, centerX, centerZ, baseHeight = 0) {
        if (!this.materials.stone) this.init(scene);

        var size = 40; // Size of the courtyard
        var wallHeight = 6;
        var towerHeight = 10;

        // --- 4 Corner Towers ---
        this.createTower(scene, centerX - size / 2, centerZ - size / 2, towerHeight, baseHeight);
        this.createTower(scene, centerX + size / 2, centerZ - size / 2, towerHeight, baseHeight);
        this.createTower(scene, centerX - size / 2, centerZ + size / 2, towerHeight, baseHeight);
        this.createTower(scene, centerX + size / 2, centerZ + size / 2, towerHeight, baseHeight);

        // --- Walls connecting them ---
        // North
        this.createWall(scene, centerX - size / 2 + 2, centerZ + size / 2, centerX + size / 2 - 2, centerZ + size / 2, wallHeight, baseHeight);
        // South (Split for Gate)
        this.createWall(scene, centerX - size / 2 + 2, centerZ - size / 2, centerX - 5, centerZ - size / 2, wallHeight, baseHeight);
        this.createWall(scene, centerX + 5, centerZ - size / 2, centerX + size / 2 - 2, centerZ - size / 2, wallHeight, baseHeight);
        // East
        this.createWall(scene, centerX + size / 2, centerZ - size / 2 + 2, centerX + size / 2, centerZ + size / 2 - 2, wallHeight, baseHeight);
        // West
        this.createWall(scene, centerX - size / 2, centerZ - size / 2 + 2, centerX - size / 2, centerZ + size / 2 - 2, wallHeight, baseHeight);

        // --- Gatehouse ---
        this.createGate(scene, centerX, centerZ - size / 2, baseHeight);

        // --- Central Keep ---
        this.createKeep(scene, centerX, centerZ, baseHeight);
    },

    createTower: function (scene, x, z, height, yOffset) {
        // Main body
        var tower = BABYLON.MeshBuilder.CreateCylinder("tower", { diameter: 6, height: height }, scene);
        tower.position = new BABYLON.Vector3(x, yOffset + height / 2, z);
        tower.material = this.materials.stone;
        tower.checkCollisions = true;

        // Top Platform (Wider)
        var top = BABYLON.MeshBuilder.CreateCylinder("towerTop", { diameter: 7, height: 1 }, scene);
        top.position = new BABYLON.Vector3(x, yOffset + height, z);
        top.material = this.materials.stone;

        // Crenellations (Battlements)
        for (var i = 0; i < 8; i++) {
            var angle = (Math.PI * 2 / 8) * i;
            var box = BABYLON.MeshBuilder.CreateBox("cren", { width: 1, height: 1, depth: 1 }, scene);
            // Position on rim
            var r = 3;
            box.position = new BABYLON.Vector3(x + Math.cos(angle) * r, yOffset + height + 0.5, z + Math.sin(angle) * r);
            box.rotation.y = -angle;
            box.material = this.materials.stone;
        }
    },

    createWall: function (scene, x1, z1, x2, z2, height, yOffset) {
        var len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
        var centerX = (x1 + x2) / 2;
        var centerZ = (z1 + z2) / 2;
        var angle = Math.atan2(z2 - z1, x2 - x1);

        var wall = BABYLON.MeshBuilder.CreateBox("wall", { width: len, height: height, depth: 2 }, scene);
        wall.position = new BABYLON.Vector3(centerX, yOffset + height / 2, centerZ);
        wall.rotation.y = -angle;
        wall.material = this.materials.stone;
        wall.checkCollisions = true;

        // Crenellations along the wall
        var count = Math.floor(len / 2);
        for (var i = 0; i < count; i++) {
            if (i % 2 === 0) { // Every other block
                var box = BABYLON.MeshBuilder.CreateBox("cren", { width: 1, height: 1, depth: 2 }, scene);
                // Local offset
                var offsetX = -len / 2 + 1 + i * 2; // Start left, move right

                // Rotate offset by wall angle
                // Actually, simpler to parent? managing parents in BJS can be tricky for physics, let's just do math.
                // The wall is rotated by -angle. 
                // Wait, CreateBox width is 'X'.

                // Let's just place them using trigonometry
                var dx = (x2 - x1) / len; // Unit vector
                var dz = (z2 - z1) / len;

                var dist = i * 2 + 1; // Distance from start
                box.position = new BABYLON.Vector3(x1 + dx * dist, yOffset + height + 0.5, z1 + dz * dist);
                box.rotation.y = -angle;
                box.material = this.materials.stone;
            }
        }
    },

    createGate: function (scene, x, z, yOffset) {
        // Archway header
        var header = BABYLON.MeshBuilder.CreateBox("gateHeader", { width: 10, height: 2, depth: 3 }, scene);
        header.position = new BABYLON.Vector3(x, yOffset + 5, z);
        header.material = this.materials.stone;

        // Portcullis (Wood bars)
        var grate = BABYLON.MeshBuilder.CreatePlane("grate", { width: 6, height: 5 }, scene);
        grate.position = new BABYLON.Vector3(x, yOffset + 2.5, z);
        grate.material = this.materials.wood;
    },

    createKeep: function (scene, x, z, yOffset) {
        // Main Block
        var keep = BABYLON.MeshBuilder.CreateBox("keep", { width: 15, height: 12, depth: 15 }, scene);
        keep.position = new BABYLON.Vector3(x, yOffset + 6, z);
        keep.material = this.materials.stone;
        keep.checkCollisions = true;

        // Entrance
        var door = BABYLON.MeshBuilder.CreatePlane("door", { width: 4, height: 6 }, scene);
        door.position = new BABYLON.Vector3(x, yOffset + 3, z - 7.6); // Slightly in front
        door.material = this.materials.wood;
    }
};
