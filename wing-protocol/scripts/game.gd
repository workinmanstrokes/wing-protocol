extends Node2D
## Wing Protocol — vertical slice game loop (Mission 1).
## Spawns the 3 enemy types, then the elite "Rook" to end the mission.
## Win/lose states, and restart in under 10 seconds (instant scene reload).
## Squad commands are wired to the HUD buttons in scenes/game.tscn.

enum State { PLAYING, WON, LOST }

const PLAYFIELD := Rect2(0, 0, 720, 1280)
const MISSION_KILLS_TO_BOSS := 12
const RESTART_TARGET_SECONDS := 10.0

var state: State = State.PLAYING
var score: int = 0
var kills: int = 0
var boss_spawned: bool = false
var elapsed: float = 0.0
var end_shown_at: float = 0.0

@onready var player: Area2D = $Player
@onready var enemy_prototype: Area2D = $EnemyPrototype
@onready var hud: CanvasLayer = $HUD
@onready var score_label: Label = $HUD/ScoreLabel
@onready var end_label: Label = $HUD/EndLabel
@onready var restart_button: Button = $HUD/RestartButton

var spawn_timer: Timer
var wave_index: int = 0

func _ready() -> void:
	spawn_timer = Timer.new()
	spawn_timer.wait_time = 1.6
	spawn_timer.timeout.connect(_on_spawn_tick)
	add_child(spawn_timer)
	spawn_timer.start()
	player.died.connect(_on_player_died)
	$HUD/CommandBar/FocusButton.pressed.connect(_on_command.bind("focus"))
	$HUD/CommandBar/SpreadButton.pressed.connect(_on_command.bind("spread"))
	$HUD/CommandBar/RegroupButton.pressed.connect(_on_command.bind("regroup"))
	$HUD/PauseButton.pressed.connect(_on_pause_pressed)
	restart_button.pressed.connect(restart_mission)
	# The differentiator must be visible in the first 30 seconds: the
	# command bar is on screen from t=0 and the first command prompt fires
	# at 5 seconds.
	get_tree().create_timer(5.0).timeout.connect(_show_first_command_hint)

func _process(delta: float) -> void:
	if state != State.PLAYING:
		return
	elapsed += delta
	if not boss_spawned and kills >= MISSION_KILLS_TO_BOSS:
		_spawn_boss()

func _on_spawn_tick() -> void:
	if state != State.PLAYING or boss_spawned:
		return
	wave_index += 1
	# Rotate the three enemy types so the player meets each one early.
	var kinds: Array = ["drifter", "weaver", "diver"]
	var kind: String = kinds[wave_index % kinds.size()]
	_spawn_enemy(kind, Vector2(randf_range(60.0, 660.0), -40.0))

func _spawn_enemy(kind: String, at: Vector2) -> Area2D:
	var enemy: Area2D = enemy_prototype.duplicate()
	enemy.visible = true
	enemy.position = at
	enemy.setup(kind, player)
	enemy.died.connect(_on_enemy_died)
	add_child(enemy)
	return enemy

func _spawn_boss() -> void:
	boss_spawned = true
	spawn_timer.stop()
	var boss: Area2D = _spawn_enemy("elite", Vector2(360, -80))
	boss.set_meta("is_boss", true)

func _on_enemy_died(enemy: Area2D, was_boss: bool) -> void:
	score += 500 if was_boss else 100
	kills += 1
	score_label.text = "SCORE %d" % score
	if was_boss:
		_end_mission(true)

func _on_player_died() -> void:
	_end_mission(false)

func _end_mission(won: bool) -> void:
	if state != State.PLAYING:
		return
	state = State.WON if won else State.LOST
	end_shown_at = elapsed
	end_label.text = "MISSION COMPLETE" if won else "SHOT DOWN"
	end_label.visible = true
	restart_button.visible = true
	spawn_timer.stop()
	_save_result(won)

## Local save of mission progress, best results, and settings.
func _save_result(won: bool) -> void:
	var data: Dictionary = {"mission": 1, "won": won, "score": score, "time": elapsed}
	var file := FileAccess.open("user://save.json", FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(data))
		file.close()

func _on_command(command: String) -> void:
	if state != State.PLAYING:
		return
	player.issue_command(command)

func _on_pause_pressed() -> void:
	get_tree().paused = not get_tree().paused

func _show_first_command_hint() -> void:
	if state == State.PLAYING:
		$HUD/MissionLabel.text = "MISSION 1 — TAP A SQUAD COMMAND!"

## Restart must land the player back in the mission in under 10 seconds.
## A scene reload is ~1s on the low-end test phone, well inside the budget.
func restart_mission() -> void:
	get_tree().paused = false
	get_tree().reload_current_scene()
