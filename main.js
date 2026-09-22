// Auto Base AI - Working Build & Auto-Poly Spawn Edition
let spawnedPoly = false;
let timer = 0;

// Спавн Poly при каждом старте или перезагрузке карты
Events.on(WorldLoadEvent, () => {
    spawnedPoly = false;
});

Events.run(Trigger.update, () => {
  timer++;
  if (timer % 60 !== 0) return;

  if (Vars.state.isMenu() || !Vars.player) return;

  const player = Vars.player;
  const team = player.team();
  if (!team) return;

  const core = team.core();
  if (!core) return;

  // 1. СПАВН POLY ПРИ ЗАХОДЕ НА СЕКТОР
  if (!spawnedPoly) {
    try {
      UnitTypes.poly.spawn(team, core.x, core.y - 20);
      spawnedPoly = true;
      Vars.ui.showLabel("[green]AI: Заспавнен Poly!", 2, core.worldx(), core.worldy());
    } catch(e) {}
  }

  // 2. АВТО-ДОБЫЧА МЕДИ И СВИНЦА
  autoMine(Items.copper, Blocks.mechanicalDrill, core, team);
  autoMine(Items.lead, Blocks.mechanicalDrill, core, team);

  // 3. АВТО-ЭНЕРГЕТИКА
  buildPowerSystem(core, team);

  // 4. АВТО-ОБОРОНА
  buildDefense(core, team);
});

// --- ДОБЫЧА И ЛОГИСТИКА ---
function autoMine(item, drillBlock, core, team) {
  let ore = Geometry.findClosest(core.x, core.y, Vars.world.tiles, tile => {
    return tile.drop() === item && tile.build == null;
  });

  if (ore != null) {
    // Гарантированная постройка блока
    ore.setNet(drillBlock, team, 0);
    buildConveyorPath(ore, core.tileOn(), team);
  }
}

// --- ЭНЕРГОСЕТЬ ---
function buildPowerSystem(core, team) {
  let coalOre = Geometry.findClosest(core.x, core.y, Vars.world.tiles, tile => {
    return tile.drop() === Items.coal && tile.build == null;
  });

  if (coalOre != null) {
    coalOre.setNet(Blocks.pneumaticDrill, team, 0);

    let genTile = coalOre.nearby(1, 1);
    if (genTile && genTile.build == null) {
      genTile.setNet(Blocks.combustionGenerator, team, 0);

      let nodeTile = genTile.nearby(0, 1);
      if (nodeTile && nodeTile.build == null) {
        nodeTile.setNet(Blocks.powerNode, team, 0);
      }
    }
    buildConveyorPath(coalOre, core.tileOn(), team);
  }
}

// --- СИСТЕМА ОБОРОНЫ ---
function buildDefense(core, team) {
  let spawns = Vars.spawner.getSpawns();
  if (spawns == null || spawns.isEmpty()) return;

  let dropZone = spawns.first();
  let targetX = Math.floor((core.x + dropZone.x) / 2 / 8);
  let targetY = Math.floor((core.y + dropZone.y) / 2 / 8);
  let frontTile = Vars.world.tile(targetX, targetY);

  if (frontTile && frontTile.build == null) {
    frontTile.setNet(Blocks.copperWallLarge, team, 0);

    let turretTile = frontTile.nearby(0, -2);
    if (turretTile && turretTile.build == null) {
      turretTile.setNet(Blocks.duo, team, 0);

      let ammoSource = Geometry.findClosest(turretTile.worldx(), turretTile.worldy(), Vars.world.tiles, tile => {
        return tile.drop() === Items.copper && tile.build != null;
      });
      if (ammoSource) buildConveyorPath(ammoSource, turretTile, team);
    }
  }
}

// --- ПРОКЛАДКА КОНВЕЙЕРОВ ---
function buildConveyorPath(fromTile, toTile, team) {
  let current = fromTile;
  let maxSteps = 40;

  while (current != null && current.distanceTo(toTile) > 2 && maxSteps > 0) {
    let rel = current.relativeTo(toTile);
    let next = current.getNearby(rel);

    if (next != null && next.build != null) {
      rel = (rel + 1) % 4;
      next = current.getNearby(rel);
    }

    if (next != null && next.build == null) {
      next.setNet(Blocks.conveyor, team, rel);
      current = next;
    } else {
      break;
    }
    maxSteps--;
  }
}
