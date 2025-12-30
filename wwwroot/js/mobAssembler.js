var MobAssembler = {
    // Cache for materials to avoid creating duplicates
    materialCache: {},

    // Main function to create a mob from a recipe
    createMob: function (scene, recipe, positionVector, idSuffix) {
        var rootMesh = new BABYLON.TransformNode("mob_root_" + idSuffix, scene);
        rootMesh.position = positionVector;

        // Map to store parts by ID for parenting
        var partsMap = {};

        recipe.Parts.forEach(part => {
            var mesh;
            var options = {};

            // Shape Construction
            switch (part.Shape) {
                case "Box":
                    mesh = BABYLON.MeshBuilder.CreateBox(part.Id, { width: part.Scale[0], height: part.Scale[1], depth: part.Scale[2] }, scene);
                    break;
                case "Sphere":
                    // Scale handling for sphere (using diameterX/Y/Z)
                    mesh = BABYLON.MeshBuilder.CreateSphere(part.Id, { diameterX: part.Scale[0], diameterY: part.Scale[1], diameterZ: part.Scale[2] }, scene);
                    break;
                case "Cylinder":
                    mesh = BABYLON.MeshBuilder.CreateCylinder(part.Id, { height: part.Scale[1], diameterTop: part.Scale[0], diameterBottom: part.Scale[2] }, scene);
                    break;
                case "Cone":
                    mesh = BABYLON.MeshBuilder.CreateCylinder(part.Id, { height: part.Scale[1], diameterTop: 0, diameterBottom: part.Scale[0] }, scene);
                    break;
                case "Capsule":
                    mesh = BABYLON.MeshBuilder.CreateCapsule(part.Id, { height: part.Scale[1], radius: part.Scale[0] / 2 }, scene);
                    break;
                case "Torus":
                    // diameter is major radius, thickness is minor
                    mesh = BABYLON.MeshBuilder.CreateTorus(part.Id, { diameter: part.Scale[0], thickness: part.Scale[2] * 0.5, tessellation: 20 }, scene);
                    break;
                default:
                    console.warn("Unknown shape: " + part.Shape);
                    mesh = BABYLON.MeshBuilder.CreateBox(part.Id, { size: 0.5 }, scene);
                    break;
            }

            // Material Handling
            if (part.ColorHex) {
                var matKey = part.ColorHex + "_" + (part.Material || "Standard");
                if (!this.materialCache[matKey]) {
                    var mat = new BABYLON.StandardMaterial(matKey, scene);
                    mat.diffuseColor = BABYLON.Color3.FromHexString(part.ColorHex);
                    if (part.Material === "Metal") {
                        mat.specularColor = new BABYLON.Color3(1, 1, 1);
                        mat.roughness = 0.2;
                    } else if (part.Material === "Glow") {
                        mat.emissiveColor = BABYLON.Color3.FromHexString(part.ColorHex);
                    }
                    this.materialCache[matKey] = mat;
                }
                mesh.material = this.materialCache[matKey];
            }

            // Transforms
            // We set position relative to parent
            mesh.position = new BABYLON.Vector3(part.Position[0], part.Position[1], part.Position[2]);

            // Rotation (Degrees to Radians)
            if (part.Rotation) {
                mesh.rotation = new BABYLON.Vector3(
                    part.Rotation[0] * (Math.PI / 180),
                    part.Rotation[1] * (Math.PI / 180),
                    part.Rotation[2] * (Math.PI / 180)
                );
            }

            // Hierarchy
            if (part.ParentId && partsMap[part.ParentId]) {
                mesh.parent = partsMap[part.ParentId];
            } else {
                mesh.parent = rootMesh;
            }

            // Register
            partsMap[part.Id] = mesh;
        });

        return rootMesh;
    }
};
