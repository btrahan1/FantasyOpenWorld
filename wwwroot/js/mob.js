class Mob {
    constructor(mesh, name, stats) {
        this.mesh = mesh;
        this.name = name;
        this.stats = stats; // hp, maxHp, speed, aggroRange
        this.state = "IDLE"; // IDLE, CHASE, ATTACK, DEAD
        this.isDead = false;
        this.animTimer = Math.random() * 100; // Random offset

        // Cache Limbs
        this.limbs = {};
        this.mesh.getDescendants().forEach(m => {
            if (m.name.includes("leg_upper_r")) this.limbs.legR = m;
            if (m.name.includes("leg_upper_l")) this.limbs.legL = m;
            if (m.name.includes("arm_upper_r")) this.limbs.armR = m;
            if (m.name.includes("arm_upper_l")) this.limbs.armL = m;
        });
    }

    update(target) {
        if (this.isDead) return;

        var dist = BABYLON.Vector3.Distance(this.mesh.position, target.position);
        var isMoving = false;

        // --- AI Logic ---
        if (dist < this.stats.aggroRange) {
            this.state = "CHASE";
            this.mesh.lookAt(target.position);

            // Move Forward
            if (dist > 1.5) { // Don't clip into player
                var forward = this.mesh.forward;
                this.mesh.position.addInPlace(forward.scale(this.stats.speed));
                isMoving = true;
            } else {
                this.state = "ATTACK";
            }
        } else {
            this.state = "IDLE";
        }

        // --- Animation ---
        if (isMoving) {
            this.animTimer += 0.2;
            var sin = Math.sin(this.animTimer);

            if (this.limbs.legR) this.limbs.legR.rotation.x = sin * 0.8;
            if (this.limbs.legL) this.limbs.legL.rotation.x = -sin * 0.8;
            if (this.limbs.armR) this.limbs.armR.rotation.x = -sin * 0.6;
            if (this.limbs.armL) this.limbs.armL.rotation.x = sin * 0.6;
        } else {
            // Reset Limbs
            if (this.limbs.legR) this.limbs.legR.rotation.x = 0;
            if (this.limbs.legL) this.limbs.legL.rotation.x = 0;
            if (this.limbs.armR) this.limbs.armR.rotation.x = 0;
            if (this.limbs.armL) this.limbs.armL.rotation.x = 0;
        }

        // Idle "Breathing" (Scaling Y)
        if (this.state === "IDLE") {
            this.mesh.scaling.y = 1.0 + Math.sin(Date.now() / 500) * 0.02;
        } else {
            this.mesh.scaling.y = 1.0;
        }
    }
}
