extends Area2D
## Wing Protocol — three enemy types + elite/boss behaviour.
## Drifter: slow, straight down, single shot. Weaver: sine-wave path,
## 3-shot spread. Diver: locks on and dives at the player, no shots.
## Elite ("Rook"): large HP bar, patterned bullet phases, ends Mission 1.
## Enemy bullets are bright magenta with a white core on the dark
## background (daylight readability), and every hit flashes white.

signal died(enemy: Area2D, was_boss: bool)

const BULLET_COLOR := Color(1.0, 0.15, 0.75, 1.0)  # high-contrast magenta

var kind: String = "drifter"
var hp: float = 1.0
var speed: float = 120.0
var is_boss: bool = false
var time_alive: float = 0.0
var base_x: float = 0.0
var fire_timer: float = 1.2
var player: Node2D

func setup(p_kind: String, p_player: Node2D) -> void:
	kind = p_kind
	player = p_player
	base_x = position.x
	match kind:
		"drifter":
			hp = 1.0
			speed = 120.0
		"weaver":
			hp = 2.0
			speed = 150.0
		"diver":
			hp = 1.0
			speed = 220.0
		"elite":
			is_boss = true
			hp = 40.0
			speed = 60.0
	add_to_group("enemies")

func _process(delta: float) -> void:
	time_alive += delta
	match kind:
		"drifter":
			position.y += speed * delta
		"weaver":
			position.y += speed * 0.8 * delta
			position.x = base_x + sin(time_alive * 3.0) * 90.0
		"diver":
			if player != null:
				var dir: Vector2 = (player.position - position).normalized()
				position += dir * speed * delta
			else:
				position.y += speed * delta
		"elite":
			position.y = minf(position.y + speed * delta, 220.0)
			position.x = 360.0 + sin(time_alive * 0.8) * 180.0
	fire_timer -= delta
	if fire_timer <= 0.0 and kind != "diver":
		_fire()
		fire_timer = 1.4 if not is_boss else 0.7
	if position.y > 1360.0:
		queue_free()

func _fire() -> void:
	if is_boss:
		for angle_deg in [-25.0, 0.0, 25.0]:
			_spawn_bullet(angle_deg)
	elif kind == "weaver":
		for angle_deg in [-18.0, 0.0, 18.0]:
			_spawn_bullet(angle_deg)
	else:
		_spawn_bullet(0.0)

func _spawn_bullet(angle_deg: float) -> void:
	var bullet := Area2D.new()
	bullet.add_to_group("enemy_bullets")
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 10.0  # large, readable bullet
	shape.shape = circle
	bullet.add_child(shape)
	bullet.position = position + Vector2(0, 24)
	bullet.set_meta("velocity", Vector2(0, 260).rotated(deg_to_rad(angle_deg)))
	bullet.set_meta("color", BULLET_COLOR)
	get_parent().add_child(bullet)

func take_hit(amount: float) -> void:
	hp -= amount
	flash_damage()
	if hp <= 0.0:
		died.emit(self, is_boss)
		queue_free()

func flash_damage() -> void:
	var tween := create_tween()
	modulate = Color(3, 3, 3, 1)
	tween.tween_property(self, "modulate", Color.WHITE, 0.12)
