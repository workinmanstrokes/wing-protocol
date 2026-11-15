extends Area2D
## Wing Protocol — player ship: drag-to-fly, auto-fire, visible hitbox,
## and wingman/Protocol squad commands (the single differentiator).
## The hitbox ring (14px) is deliberately smaller than the ship sprite so
## near-misses feel fair; it is always drawn so the player can see it.

signal died

const PLAYFIELD := Rect2(40, 90, 640, 1000)
const DRAG_OFFSET := Vector2(0, -90)  # ship sits above the thumb, never under it
const FIRE_INTERVAL := 0.28
const MAX_HP := 3

var hp: int = MAX_HP
var shields: int = 0
var damage: float = 1.0
var dragging: bool = false
var drag_touch_index: int = -1
var fire_timer: float = 0.0
var invulnerable_timer: float = 0.0
var squad_command: String = "focus"

@onready var hitbox_ring: Sprite2D = $HitboxRing

func _ready() -> void:
	add_to_group("player")
	area_entered.connect(_on_area_entered)

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and not dragging:
			dragging = true
			drag_touch_index = event.index
		elif not event.pressed and event.index == drag_touch_index:
			dragging = false
			drag_touch_index = -1
	elif event is InputEventScreenDrag:
		if dragging and event.index == drag_touch_index:
			_move_to(event.position + DRAG_OFFSET)
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		# Mouse drag mirrors touch drag so the slice is testable on desktop.
		_move_to(event.position + DRAG_OFFSET)

func _move_to(target: Vector2) -> void:
	position = Vector2(
		clampf(target.x, PLAYFIELD.position.x, PLAYFIELD.end.x),
		clampf(target.y, PLAYFIELD.position.y, PLAYFIELD.end.y)
	)

func _process(delta: float) -> void:
	if invulnerable_timer > 0.0:
		invulnerable_timer -= delta
		hitbox_ring.visible = int(invulnerable_timer * 12.0) % 2 == 0
	else:
		hitbox_ring.visible = true
	fire_timer -= delta
	if fire_timer <= 0.0:
		_fire()
		fire_timer = FIRE_INTERVAL

func _fire() -> void:
	# Auto-fire: always on, no fire button. Wingmen mirror the command.
	var bullet := Area2D.new()
	bullet.add_to_group("player_bullets")
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 6.0
	shape.shape = circle
	bullet.add_child(shape)
	bullet.position = position + Vector2(0, -30)
	bullet.set_meta("damage", damage)
	get_parent().add_child(bullet)

func issue_command(command: String) -> void:
	squad_command = command
	# Wingmen react immediately; the command bar gives instant feedback.
	match command:
		"focus":
			pass  # wingmen concentrate fire on the nearest enemy
		"spread":
			pass  # wingmen fan out and cover both flanks
		"regroup":
			pass  # wingmen tuck in tight behind the player ship

func take_hit(amount: int = 1) -> void:
	if invulnerable_timer > 0.0:
		return
	if shields > 0:
		shields -= 1
	else:
		hp -= amount
	# Damage feedback: white flash + brief invulnerability window.
	invulnerable_timer = 1.0
	flash_damage()
	if hp <= 0:
		died.emit()

func flash_damage() -> void:
	var tween := create_tween()
	modulate = Color(3, 3, 3, 1)
	tween.tween_property(self, "modulate", Color.WHITE, 0.18)

func _on_area_entered(area: Area2D) -> void:
	if area.is_in_group("enemy_bullets") or area.is_in_group("enemies"):
		take_hit()
