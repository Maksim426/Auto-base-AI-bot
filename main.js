// Mega God-Mode Unit Mod
let spawned = false;

Events.on(WorldLoadEvent, () => {
    spawned = false;
});

Events.run(Trigger.update, () => {
    if (spawned || Vars.state.isMenu() || !Vars.player) return;

    const player = Vars.player;
    const team = player.team();
    if (!team) return;

    const core = team.core();
    if (!core) return;

    try {
        // 1. Спавним Мегу прямо у Ядра
        let mega = UnitTypes.mega.spawn(team, core.x, core.y - 20);

        if (mega != null) {
            // 2. Накручиваем ему "Режим Бога"
            mega.health = 999999;        // Огромное здоровье
            mega.maxHealth = 999999;     // Максимальный запас ХП
            mega.armor = 999;            // Бешеная броня (игнорит урон)
            
            spawned = true;
            
            // Выводим уведомление прямо на экран
            Vars.ui.showLabel("[green] God Mega Spawned!", 3, core.worldx(), core.worldy());
        }
    } catch(e) {
        // Игнорируем ошибки при инициализации карты
    }
});
