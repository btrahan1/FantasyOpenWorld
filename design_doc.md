# Design Doc: Fantasy Open World

## Overview
A 3D Open World RPG inspired by classic MMOs.
*   **Perspective**: Third-Person / First-Person Hybrid.
*   **Setting**: High Fantasy. Starting Zone: The Sun-Scorched Desert.
*   **Tech Stack**: Blazor WebAssembly + Babylon.js.

## Core Mechanics
### 1. The World
*   **Zones**: Distinct areas with unique terrain and mob types.
*   **Terrain**: Generated using heightmaps to create hills and dunes.
*   **Camps**: Mobs do not roam aimlessly; they spawn in "Camps" (clusters).

### 2. The Combat
*   **Aggro System**: Mobs have a radius. If Player < Radius, Mob Chases.
*   **Stats**:
    *   **HP**: Health Points.
    *   **Level**: Determines difficulty (1-10).
    *   **Damage**: Flat value based on level.
*   **Feedback**: Floating damage numbers? Simple HP bar reduction?

### 3. The Mobs
#### Mob Library
*   **Goblin Grunt** (Level 1-3)
    *   *Visuals*: Green, geometric, large ears.
    *   *Behavior*: Swarm. Low HP, fast attack.
    *   *Weapon*: Crude Club/Axe.

## User Assets
*   **Reference Image**: `uploaded_image_1767069764649.png` (Goblin Grunt).
