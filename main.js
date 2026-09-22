// Auto Base AI - Advanced State Machine Edition

// Состояния нашего "Мозга"
const AI_STATE = {
  INIT: 0,
  BASIC_MINING: 1, // Добыча базовых ресурсов (Медь, Свинец)
  POWER: 2,        // Энергетика (Уголь, Генераторы)
  DEFENSE: 3,      // Защита (Стены, Турели Duo/Salvo)
  ADVANCED: 4      // Сложные заводы (Кремний)
};

let currentState = AI_STATE.INIT;
let timer = 0;

Events.run(Trigger.update, () => {
  timer++;
  // Бот "думает" раз в 60 кадров (1 раз в секунду), чтобы не тормозить игру
  if (timer % 60 !== 0) return;

  const player = Vars.player;
  if (!player || !player.team() || !player.team().core()) return;

  const core = player.team().core();
  const team = player.team();

  // 1. Анализируем базу и принимаем решение, что делать дальше
  updateAIState(core);

  // 2. Выполняем действия в зависимости от выбранной стратегии
  switch (currentState) {
    case AI_STATE.BASIC_MINING:
      // Ищем медь и свинец
      mineResource(Items.copper, Blocks.mechanicalDrill, core, team);
      if (core.items.get(Items.copper) > 100) {
        mineResource(Items.lead, Blocks.mechanicalDrill, core, team);
      }
      break;

    case AI_STATE.POWER:
      // Строим угольные буры и генераторы
      buildPowerGrid(core, team);
      break;

    case AI_STATE.DEFENSE:
      // Возводим фронт обороны
      buildDefenseLine(core, team);
      break;
      
    case AI_STATE.ADVANCED:
      // Здесь в будущем можно добавить постройку заводов кремния
      break;
  }
});

// ==========================================
// МОДУЛЬ 1: АНАЛИЗАТОР (МОЗГ)
// ==========================================
function updateAIState(core) {
  let copper = core.items.get(Items.copper);
  let lead = core.items.get(Items.lead);
  let coal = core.items.get(Items.coal);

  if (copper < 400 || lead < 200) {
    currentState = AI_STATE.BASIC_MINING; // Критически мало базы
  } else if (coal < 100 && copper >= 400) {
    currentState = AI_STATE.POWER;        // База есть, нужна энергия
  } else {
    currentState = AI_STATE.DEFENSE;      // Ресурсов полно, готовимся к бою
  }
}

// ==========================================
// МОДУЛЬ 2: ЭКОНОМИКА (ДОБЫЧА И ЛОГИСТИКА)
// ==========================================
function mineResource(item, drillBlock, core, team) {
  // Находим ближайшую свободную руду нужного типа
  let oreTile = Geometry.findClosest(core.x, core.y, Vars.world.tiles, tile => {
    return tile.drop() === item && tile.build == null;
  });

  if (oreTile != null && core.items.has(drillBlock.requirements)) {
    // Ставим бур
    Call.constructFinish(oreTile, drillBlock, Vars.player.unit(), 0, team, null);
    // Прокладываем ленту к ядру
    buildConveyorLine(oreTile, core.tileOn(), team);
  }
}

// ==========================================
// МОДУЛЬ 3: ЭНЕРГЕТИКА
// ==========================================
function buildPowerGrid(core, team) {
  let coalTile = Geometry.findClosest(core.x, core.y, Vars.world.tiles, tile => {
    return tile.drop() === Items.coal && tile.build == null;
  });

  if (coalTile != null) {
    // Ставим пневмо-бур на уголь
    Call.constructFinish(coalTile, Blocks.pneumaticDrill, Vars.player.unit(), 0, team, null);
    
    // Пытаемся воткнуть Combustion Generator рядом с буром
    let genTile = coalTile.nearby(1, 1);
    if (genTile && genTile.build == null) {
      Call.constructFinish(genTile, Blocks.combustionGenerator, Vars.player.unit(), 0, team, null);
    }
    // Проводим конвейер, чтобы уголь шел и в Ядро
    buildConveyorLine(coalTile, core.tileOn(), team);
  }
}

// ==========================================
// МОДУЛЬ 4: ОБОРОНА И АНАЛИЗ ФРОНТА
// ==========================================
function buildDefenseLine(core, team) {
  let spawns = Vars.spawner.getSpawns();
  if (spawns.isEmpty()) return; // Врагов на карте нет (режим песочницы)
  
  let dropZone = spawns.first(); // Точка высадки врагов

  // Ищем идеальную точку для перекрытия (между ядром и спавном)
  let midX = (core.x + dropZone.x) / 2;
  let midY = (core.y + dropZone.y) / 2;
  let targetTile = Vars.world.tile(Math.floor(midX / 8), Math.floor(midY / 8));

  if (targetTile && targetTile.build == null) {
    // Ставим медную/титановую стену
    Call.constructFinish(targetTile, Blocks.copperWallLarge, Vars.player.unit(), 0, team, null);
    // Чуть позади стены ставим турель Duo
    let turretTile = targetTile.nearby(0, -2);
    if (turretTile && turretTile.build == null) {
      Call.constructFinish(turretTile, Blocks.duo, Vars.player.unit(), 0, team, null);
      
      // ИИ должен найти медь и подвести её к турели (упрощенная логика)
      let ammoSource = Geometry.findClosest(turretTile.worldx(), turretTile.worldy(), Vars.world.tiles, tile => {
         return tile.drop() === Items.copper && tile.build != null; // Ищем ближайший рабочий бур
      });
      if(ammoSource) buildConveyorLine(ammoSource, turretTile, team);
    }
  }
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ АЛГОРИТМЫ (A* PATHFINDING)
// ==========================================
function buildConveyorLine(fromTile, toTile, team) {
  let current = fromTile;
  const conveyor = Blocks.conveyor;
  let maxBlocks = 100; // Защита от зависания (бесконечного цикла)

  while (current != null && current.distanceTo(toTile) > 2 && maxBlocks > 0) {
    let rel = current.relativeTo(toTile);
    let next = current.getNearby(rel);
    
    // Обходим препятствия: если прямо занято, пытаемся шагнуть вбок
    if (next != null && next.build != null) {
       next = current.getNearby((rel + 1) % 4); 
    }

    if (next != null && next.build == null) {
      Call.constructFinish(next, conveyor, Vars.player.unit(), rel, team, null);
      current = next;
    } else {
      break;
    }
    maxBlocks--;
  }
}
