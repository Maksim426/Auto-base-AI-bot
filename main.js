// Auto Base AI - Full Advanced Bot (Serpulo)
let timer = 0;

Events.run(Trigger.update, () => {
  timer++;
  // Запуск логики каждые 60 тиков (раз в секунду)
  if (timer % 60 !== 0) return;

  const player = Vars.player;
  if (!player || !player.team() || !player.team().core()) return;

  const core = player.team().core();
  const team = player.team();

  // 1. АВТО-ДОБЫЧА МЕДИ И СВИНЦА
  autoMine(Items.copper, Blocks.mechanicalDrill, core, team);
  autoMine(Items.lead, Blocks.mechanicalDrill, core, team);

  // 2. АВТО-ЭНЕРГЕТИКА (Уголь + Генераторы)
  if (core.items.get(Items.copper) > 100 && core.items.get(Items.lead) > 100) {
    buildPowerSystem(core, team);
  }

  // 3. АВТО-ОБОРОНА (При наличии спавна врагов)
  if (core.items.get(Items.copper) > 200) {
    buildDefense(core, team);
  }
});

// --- ДОБЫЧА И ЛОГИСТИКА ---
function autoMine(item, drillBlock, core, team) {
  let ore = Geometry.findClosest(core.x, core.y, Vars.world.tiles, tile => {
    return tile.drop() === item && tile.build == null;
  });

  if (ore != null) {
    Call.constructFinish(ore, drillBlock, Vars.player.unit(), 0, team, null);
    buildConveyorPath(ore, core.tileOn(), team);
  }
}

// --- ЭНЕРГОСЕТЬ ---
function buildPowerSystem(core, team) {
  let coalOre = Geometry.findClosest(core.x, core.y, Vars.world.tiles, tile => {
    return tile.drop() === Items.coal && tile.build == null;
  });

  if (coalOre != null) {
    // Ставим бур на уголь
    Call.constructFinish(coalOre, Blocks.pneumaticDrill, Vars.player.unit(), 0, team, null);

    // Ставим генератор рядом
    let genTile = coalOre.nearby(1, 1);
    if (genTile && genTile.build == null) {
      Call.constructFinish(genTile, Blocks.combustionGenerator, Vars.player.unit(), 0, team, null);
      
      // Связываем ЛЭП к ядру
      let nodeTile = genTile.nearby(0, 1);
      if (nodeTile && nodeTile.build == null) {
        Call.constructFinish(nodeTile, Blocks.powerNode, Vars.player.unit(), 0, team, null);
      }
    }
    buildConveyorPath(coalOre, core.tileOn(), team);
  }
}

// --- СИСТЕМА ОБОРОНЫ ---
function buildDefense(core, team) {
  let spawns = Vars.spawner.getSpawns();
  if (spawns == null || spawns.isEmpty()) return; // Если спавнов нет (песочница без волн)

  let dropZone = spawns.first();
  let targetX = Math.floor((core.x + dropZone.x) / 2 / 8);
  let targetY = Math.floor((core.y + dropZone.y) / 2 / 8);
  let frontTile = Vars.world.tile(targetX, targetY);

  if (frontTile && frontTile.build == null) {
    // Строим большую медную стену
    Call.constructFinish(frontTile, Blocks.copperWallLarge, Vars.player.unit(), 0, team, null);

    // Ставим турель Duo за стеной
    let turretTile = frontTile.nearby(0, -2);
    if (turretTile && turretTile.build == null) {
      Call.constructFinish(turretTile, Blocks.duo, Vars.player.unit(), 0, team, null);

      // Тянем к турели медь для патронов
      let ammoSource = Geometry.findClosest(turretTile.worldx(), turretTile.worldy(), Vars.world.tiles, tile => {
        return tile.drop() === Items.copper && tile.build != null;
      });
      if (ammoSource) buildConveyorPath(ammoSource, turretTile, team);
    }
  }
}

// --- УМНАЯ ПРОКЛАДКА КОНВЕЙЕРОВ (A* / Вращение) ---
function buildConveyorPath(fromTile, toTile, team) {
  let current = fromTile;
  let maxSteps = 60;

  while (current != null && current.distanceTo(toTile) > 2 && maxSteps > 0) {
    let rel = current.relativeTo(toTile);
    let next = current.getNearby(rel);

    // Обход препятствий
    if (next != null && next.build != null) {
      rel = (rel + 1) % 4;
      next = current.getNearby(rel);
    }

    if (next != null && next.build == null) {
      Call.constructFinish(next, Blocks.conveyor, Vars.player.unit(), rel, team, null);
      current = next;
    } else {
      break;
    }
    maxSteps--;
  }
}
