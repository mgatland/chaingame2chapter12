var Cerulean = function () {

	var GameWindow = function () {
		this.width = 0;
		this.height = 0;
		var _this = this;

		this.resize = function () {
			_this.width = window.innerWidth;
			_this.height = window.innerHeight;
		}

		this.resize();
		window.addEventListener("resize", this.resize);
	}

	var GameConsts = {
		tileSize: 32,
		worldWidth: 460,
		worldHeight: 460,
		wallWidth: 8
	};

	var Camera = function () {
		this.pos = new Pos();
	}

	var Messages = function (player, audioUtil, msgRenderer) {
		var messageQueue = [];
		var nextMessageDelay = 0;
		var fps = 60; //number of frames per second

		this.addMessage = function (msg, delay, func, big) {
			messageQueue.push({msg:msg, delay:delay, func:func, big:big});
		}

		this.clearMessages = function () {
			//Execute any functions before clearing
			messageQueue.forEach(function (msg) {
				if (msg.func) msg.func();
			});
			messageQueue = [];
			nextMessageDelay = 0;
		}

		this.update = function () {
			if (nextMessageDelay > 0) {
				nextMessageDelay--; //frame rate
			} else if (messageQueue.length > 0) {
				var msg = messageQueue[0];
				if (true) { //you can always add messages for now
					messageQueue.shift();
					audioUtil.playAddMessage();
					player.message = msg;
					player.messageWaiting = false;
					nextMessageDelay = msg.delay * fps;
					if (msg.func) msg.func();
				} else {
					player.messageWaiting = true;
				}
			}
		}
	}

	var Story = function (specialItems) {
		var _this = this;
		//"intro" - cannot pass through doorways, do not show HUD.
		this.mode = "intro2"; 
		this.shaking = false;
		this.won = false;
		this.startScreen = true;
		this.endScreen = false;

		var sec = 60; //just a constant

		var storyFrame = 0;
		this.update = function (messages, player, companion, audioUtil) {

			var quietAndTogether = (companion && player.room === companion.room && player.room.enemies.length === 0);

			if (this.won) {
				this.mode = "won";
				this.won = false; //it's a single use flag
				storyFrame = 0;
				messages.clearMessages();
			} else if (this.mode == "won") {
				storyFrame++;
				if (storyFrame == 0.5*sec) {
					messages.addMessage("What have you done?", 2);
					messages.addMessage("My gateways are ruined!", 2);
					messages.addMessage("Troublemaker.", 2);
					messages.addMessage("Wherever you run, Britain will find you.", 3,
						function () {
						console.log("show end screen");
						_this.endScreen = true;
					});
					messages.addMessage("We have power you can't imagine!", 2);
					messages.addMessage("END OF CHAPTER 12", 999, null, true);
				}
			} else if (this.mode == "intro") {
				storyFrame++;
				if (storyFrame == 0.5*sec) {
					for (var i = 0; i < 10; i++) {
						messages.addMessage("", 0);	
					}
					
				}

			} else if (this.mode === "intro2") {
				storyFrame++;
				if (storyFrame == 0.5*sec) {
					messages.addMessage("", 2, null, true); //hardcoded Chapter 12, by Matthew Gatland
					messages.addMessage("Troublemaker.", 2);
					messages.addMessage("That's what they call you.", 2, function () {_this.startScreen = false;});
					messages.addMessage("Roaming the stars, causing chaos,", 3);
					messages.addMessage("And revealing all our human weaknesses.", 3);
					messages.addMessage("I had to pull you home.", 3);
					messages.addMessage("", 1);
					messages.addMessage("I asked MI6 to scan your phone.", 3);
					messages.addMessage("Impressive location history.", 3);
					messages.addMessage("My starpervs are now opening gateways", 3);
					messages.addMessage("To every world you visited.", 3);
					messages.addMessage("Soon, Britain's armies will invade them all.", 3);
					messages.addMessage("The United Kingdom will rule through space!", 3);
					messages.addMessage("All thanks to you.", 3);
					messages.addMessage("Anyway, enough chit chat.", 2);
					messages.addMessage("I have an invasion to plan.", 2);
					messages.addMessage("", 1);
				}
			}
		}

		this.roomsExplored = function (amount, messages) {
			//console.log("Rooms " + amount);
			//if (amount == 3) messages.addMessage("Justin: The rooms were all empty before.");
			//if (amount == 4) messages.addMessage("Justin: I must have woken up the defence system.");
		}

		this.hackedFirstRoom = function (player, audioUtil) {
			player.room.locked = false;
			audioUtil.playGotItem();
		}

		this.gotCollectorItem = function (player) {
			if (this.mode === "game2") {
				this.mode = "game3";
				storyFrame = 0;
				player.canCollectGreenDots = true;
			}
		}

		this.gotEyesItem = function (player) {
			if (this.mode === "game3") {
				this.mode = "game4";
				storyFrame = 0;
			}
		}
	}

	var humanMixin = {
		room: null,
		lastRoom: null,
		health: 0,
		maxHealth: 5,
		invulnerableTime: 0,
		size: new Pos(20, 20),
		speed: 4,
		isCollidingWith: function (point) {
			return (point.pos.x >= this.pos.x && point.pos.y >= this.pos.y
				&& point.pos.x < this.pos.x + this.size.x && point.pos.y < this.pos.y + this.size.y);
		},
		_moveTowards: function (destination, moveType, maxSpeed) {
			var center = this.getCenter();
			if (!maxSpeed) maxSpeed = this.speed;
			if (moveType == "horizontal") {
				var distance = Math.abs(destination.x - center.x);
				maxSpeed = Math.min(maxSpeed, distance);
				if (distance == 0) return;
				if (destination.x < center.x) {
					this._moveInDir(Dir.LEFT, maxSpeed);
				} else {
					this._moveInDir(Dir.RIGHT, maxSpeed);
				}
			} else if (moveType == "vertical") {
				var distance = Math.abs(destination.y - center.y);
				maxSpeed = Math.min(maxSpeed, distance);
				if (distance == 0) return;
				if (destination.y < center.y) {
					this._moveInDir(Dir.UP, maxSpeed);
				} else {
					this._moveInDir(Dir.DOWN, maxSpeed);
				}
			}
		},

		getCenter: function () {
			var x = Math.floor(this.pos.x + this.size.x / 2);
			var y = Math.floor(this.pos.y + this.size.y / 2);
			return new Pos(x, y);
		},

		_moveInDir: function (dir, maxSpeed) {
			var speed = maxSpeed ? Math.min(maxSpeed, this.speed) : this.speed;
			this.pos.moveInDir(dir, speed);
			while (this.room.isCollidingWith(this)) {
				this.pos.moveInDir(dir, -1);
			}
		},

		_updateCurrentRoom: function (audioUtil, messages) {
			var player = this;
			if (!player.room.containsAllOf(player)) {
				player._inDoorway(audioUtil);
				player.room.doors.forEach(function (door) {
					if (door.otherRoom.containsSomeOf(player)) {

						player._enteredRoom(door.otherRoom, messages);

						if (door.otherRoom.containsCenterOf(player)) {
							var oldRoom = player.lastRoom;
							player.lastRoom = player.room;
							player.room = door.otherRoom;
							if (oldRoom && oldRoom != player.lastRoom && oldRoom != player.room) {
								player._leftRoom(oldRoom);
							}
						} else {
							var oldRoom = player.lastRoom;
							player.lastRoom = door.otherRoom;
							if (oldRoom && oldRoom != player.lastRoom && oldRoom != player.room) {
								player._leftRoom(oldRoom);
							}
						}
					}
				});
			} else {
				//we're fully inside one room now.
				if (player.lastRoom) {
					player._leftRoom(player.lastRoom);
					player.lastRoom = null;
				}
			}
		}
	}

	var noop = function () {};

	var Companion = function (room) {
		extend(this, humanMixin);
		this.home = room;
		this.room = room;
		this.health = this.maxHealth;
		this.pos = this.home.getCenter();
		this.pos.x *= GameConsts.tileSize;
		this.pos.y *= GameConsts.tileSize;

		var oldPath = null;
		var oldPathEnd = null;
		var oldPathStart = null;

		this.stunTarget = null;

		this._pathIsDirty = function (end) {
			return (this.room != oldPathStart || end != oldPathEnd);
		}

		var safeTimer = 0;
		this.update = function (player) {

			if (this.wandTarget && !this.wandTarget.live) {
				this.wandTarget = null;
			}

			//fully charged. Shall we attack?
			var oldTarget = this.stunTarget;
			var newTarget = null;
			if (this.room.enemies.length > 0) {
				newTarget = this.room.enemies.reduce(function (p, v) {
					return (p.type > v.type && p.live === true ? p : v);
				});
			}

			if (newTarget != oldTarget) {
				if (oldTarget) oldTarget.stunned = false;
				if (newTarget) newTarget.stunned = true;
				this.stunTarget = newTarget;
			}

			if (player.room.enemies.length == 0) {
				safeTimer++;
			} else {
				safeTimer = 0;
			}

			if (this.room == player.room) {
				if (this.room.enemies.length == 0) {
					var distToPlayer = this.pos.distanceTo(player.pos);
					if (distToPlayer > 50 && safeTimer > 45) {
						this._moveTowards(player.pos, "horizontal", 2);
						this._moveTowards(player.pos, "vertical", 2);
					}
				}
			} else {
				var path = this._pathIsDirty(player.room) ? this.room.getPathTo(player.room) : oldPath;
				oldPath = path;
				oldPathEnd = player.room;
				oldPathStart = this.room;

				var doorToUse = this.room.doors.filter(function (door) {
					return door.otherRoom === path[0];
				}).pop();
				var moveDest = doorToUse.getCenter();

				var moveDest;
				if (doorToUse.overlaps(this)) {
					moveDest = doorToUse.getFarSidePos();
					this.invulnerableTime = 7;
				} else {
					moveDest = doorToUse.getNearSidePos();
					this.invulnerableTime = 0;
				}
				this._moveTowards(moveDest, "horizontal");
				this._moveTowards(moveDest, "vertical");
			}
			this._updateCurrentRoom();
		};
		this._inDoorway = noop;
		this._leftRoom = noop;
		this._enteredRoom = noop;
	}

	var Player = function () {
		extend(this, humanMixin);

		var _this = this;
		this.roomsExplored = 0;

		this.invlunerableTime = 0;
		this.shieldRechange = 0;
		this.home = null;
		this.items = 0;

		this.attackCharge = 0;
		this.maxAttackCharge = 5 * 60;
		this.attackChargeLimit = this.maxAttackCharge;

		this.canUseDoors = true;
		this.canAttack = false;

		this.story = null; //Set me externally! FIXME

		var isChargingAttack = false;

		this.setHome = function (room) {
			this.home = room;
		}

		this.respawn = function () {
			this.health = this.maxHealth;
			this.pos = this.home.getCenter();
			this.pos.x *= GameConsts.tileSize;
			this.pos.y *= GameConsts.tileSize;
			if (this.room) this.room.cleanUp();
			if (this.lastRoom) this.lastRoom.cleanUp();
			this.room = this.home;
			this.lastRoom = null;
		}

		this.resetCharge = function (audioUtil) {
			if (this.attackCharge > 3) {
				audioUtil.playerResetCharge();
			}
			this.attackCharge = 0;
		}

		this._autoMove = function (moveType) {
			var player = this;
			var myDoor = this.room.doors.filter(function (d) {
				return d.overlaps(player);
			});
			if (myDoor.length > 0) {
				var door = myDoor[0];
				var doorCenter = door.getCenter();
				if (moveType == "vertical" && door.direction.isHorizontal) {
					this._moveTowards(doorCenter, "vertical");
				} else if (moveType == "horizontal" && !door.direction.isHorizontal) {
					var doorCenter = door.getCenter();
					this._moveTowards(doorCenter, "horizontal");
				}
			}
		}

		this._updateMovement = function (keyboard) {
			if (this.health <= 0) return;

			if (keyboard.isKeyDown(KeyEvent.DOM_VK_SPACE) && this.canAttack) {
				isChargingAttack = true;
			} else {
				isChargingAttack = false;
			}

			//cheats
			if (keyboard.isKeyDown(KeyEvent.DOM_VK_Q) && keyboard.isKeyDown(KeyEvent.DOM_VK_L)) {
				this.cheatMode = true;
				this.speed = 10;
			}

			var up = keyboard.isKeyDown(KeyEvent.DOM_VK_UP);
			var down = keyboard.isKeyDown(KeyEvent.DOM_VK_DOWN);
			var left = keyboard.isKeyDown(KeyEvent.DOM_VK_LEFT);
			var right = keyboard.isKeyDown(KeyEvent.DOM_VK_RIGHT);

			var oldPos = this.pos.clone();

			if (right) {
				this._moveInDir(Dir.RIGHT);
			} else if (left) {
				this._moveInDir(Dir.LEFT);
			}

			if (up) {
				this._moveInDir(Dir.UP);
			} else if (down) {
				this._moveInDir(Dir.DOWN);
			}

			//If we're running into a wall, make an automove.
			if (this.canUseDoors && !this.room.locked) {
				if (oldPos.x == this.pos.x && (left || right)) this._autoMove("vertical");
				if (oldPos.y == this.pos.y && (up || down)) this._autoMove("horizontal");
			}

		}

		this.attack = function (roomToAttack, audioUtil) {
			var player = this;
			roomToAttack.flashing = Math.floor(Math.max(3, 25 * player.attackCharge / player.maxAttackCharge));

			var liveEnemiesBefore = roomToAttack.countEnemies();

			roomToAttack.enemies.forEach(function (enemy) {
				enemy.shocked(player.attackPowerOn(enemy));
			});
			roomToAttack.shots.forEach(function (shot) {
				shot.shocked(player.attackPowerOn(shot));
			});

			var liveEnemiesAfter = roomToAttack.countEnemies();

			var duration = player.attackCharge / player.maxAttackCharge;
			var gotKill = (liveEnemiesAfter < liveEnemiesBefore);

			//longer if we cleared a room
			if (liveEnemiesAfter == 0 && liveEnemiesBefore > 0) duration += 0.5;
			audioUtil.playerAttack(duration, gotKill);

		}

		this._updateAttackCharge = function (keyboard, audioUtil) {
			if (this.health > 0) {
				if (isChargingAttack) {
					this.attackCharge++;
					if (this.attackCharge > this.attackChargeLimit) {
						this.attackCharge = this.attackChargeLimit;
					}
				} else {
					if (this.attackCharge > 0) {
						this.attack(this.room, audioUtil);
						if (this.lastRoom) this.attack(this.lastRoom, audioUtil);
					}
					this.attackCharge = 0;
				}
			}
			audioUtil.setCharging(isChargingAttack);
		}

		this._updateHealthAndShield = function () {
			if (this.invlunerableTime > 0) {
				this.invlunerableTime--;
			} else {
				if (this.health <= 0) {
					track("respawned", ""+this.roomsExplored);
					this.respawn();
				}

				if (this.health < this.maxHealth) {
					this.shieldRechange++;
					if (this.shieldRechange > 60) {
						this.shieldRechange = 0;
						this.health++;
					}
				}
			}
		}

		this._enteredRoom = function (room, messages) {
			if (!room.explored) {
				room.explored = true;
				this.roomsExplored++;
				this.story.roomsExplored(this.roomsExplored, messages);
				if (this.roomsExplored % 10 == 0) {
					track("explored", ""+this.roomsExplored);
				}
			}
		}

		this._leftRoom = function (room) {
			room.cleanUp();
		}

		this._inDoorway = function (audioUtil) {
			this.resetCharge(audioUtil);
		}

		this.update = function (keyboard, audioUtil, messages) {
			this._updateMovement(keyboard);
			this._updateAttackCharge(keyboard, audioUtil);
			this._updateHealthAndShield();

			var roomsPreviouslyExplored = this.roomsExplored;
			this._updateCurrentRoom(audioUtil, messages);
			if (this.roomsExplored > roomsPreviouslyExplored) {

			}

			this.itemHint = null;
			var itemDist = 999999;
			this.canAttack = false;
			this.room.items.forEach(function (item) {
				if (item.getCenter().distanceTo(_this.getCenter()) < item.size.x / 2 + _this.size.x + 20) {
					if (_this.attackCharge >= _this.attackChargeLimit) {
						item.activate(_this);
					} else {
						_this.itemHint = item.description;
						if (item.canBeUsed) {
							_this.canAttack = true;
						}
					}
				}
			});
		}

		this.hit = function (audioUtil) {
			if (this.cheatMode) return;
			if (this.invlunerableTime > 0 || this.health <= 0) return;
			this.health--;
			this.shieldRechange = 0;
			console.log('hit!');
			if (this.health > 0) {
				audioUtil.shotHitPlayer(this.health);
				this.invlunerableTime = 2;
			} else {
				audioUtil.playerDied();
				isChargingAttack = false;
				this.attackCharge = 0;
				this.invlunerableTime = 60; //we won't respawn until this wears off
			}
		}

		this.attackPowerOn = function (enemy) {
			var dist = this.getCenter().distanceTo(enemy.getCenter());
			var multi = enemy.stunned ? 2 : 1;
			return multi * Math.floor(100 * this.attackCharge / this.maxAttackCharge - dist/10);
		}

	}

	var Shot = function (pos, room, angle) {
		this.angle = angle;
		this.pos = pos;
		this.speed = 2;
		this.live = true;
		this.targetted = false;
		this.health = 1;
		this.update = function (player, audioUtil) {
			this.pos.moveAtAngle(this.angle, this.speed);
			if (room.isCollidingWith(this, true)) {
				this.live = false;
			}
			if (player && player.isCollidingWith(this)) {
				player.hit(audioUtil);
				this.live = false;
			}

			//update highlight status
			if (player && player.attackPowerOn(this) > this.health) {
				this.targetted = true;
			} else {
				this.targetted = false;
			}
		}

		this.getCenter = function () {
			return this.pos;
		}

		this.shocked = function (damage) {
			if (!this.live) return;
			if (damage > this.health) {
				this.health = 0;
				this.live = false;
				this.pos.floor();
				room.items.push(new Item(this.pos));
			}
		}
	}

	var Item = function (pos, special, description, afterDescription, onCollected) {
		this.live = true;
		this.canBeUsed = true;
		this.pos = pos;
		this.special = special ? true : false;
		this.description = description;
		this.afterDescription = afterDescription;
		if (this.special) {
			this.size = new Pos(32, 32);
		} else {
			this.size = new Pos(2, 2);
		}
		this.onCollected = onCollected;

		this.getCenter = function () {
			var x = Math.floor(this.pos.x + this.size.x / 2);
			var y = Math.floor(this.pos.y + this.size.y / 2);
			return new Pos(x, y);
		};

		this.update = function (player, audioUtil) {
			/*if (player) {
				var distance = this.getCenter().distanceTo(player.getCenter());
				if (distance < 128 && !special && player.canCollectGreenDots) { //normal items are sucked up
					var angle = this.pos.angleTo(player.getCenter());
					var speed = 6 * (128 - distance) / 128;
					var xSpeed = (speed * Math.sin(3.14159 / 180.0 * angle));
					var ySpeed = (speed * -Math.cos(3.14159 / 180 * angle));
					this.pos.x += xSpeed;
					this.pos.y += ySpeed;
				}
				if (distance < player.size.x / 2 + this.size.x / 2 || distance < player.size.y / 2 + this.size.y / 2) {
					if (special) {
						this.live = false;
						if (this.onCollected) this.onCollected(player);
					} else if (player.canCollectGreenDots) {
						this.live = false;
						player.items++;
						audioUtil.playerCollectedBit();
					}
				}
			}*/
		};

		this.activate = function (player) {
			this.canBeUsed = false;
			this.description = this.afterDescription;
			if (this.onCollected) {
				this.onCollected(player);
			}
		}
	}

	var Enemy = function (pos, room, type, callback) {
		this.pos = pos;
		this.room = room;
		this.dest = null;
		this.refireTimer = 0;
		this.health = 20;
		this.live = true;
		this.angle = 0;
		this.fireAngle = Math.floor(Math.random() * 360);
		this.type = type;
		this.stunned = false;

		if (this.type == 0) { //fires at player square
			this.size = new Pos(25, 25);
			this.speed = 0.3;
			this.health = 20;
		} else if (this.type == 1) { //fires in a spiral horizontal line
			this.size = new Pos(35, 20);
			this.speed = 0.0;
			this.health = 15;
		} else if (this.type == 2) { //fires 5 shots at player (big square)
			this.size = new Pos(44, 44);
			this.speed = 0.2;
			this.health = 30;
		} else if (this.type == 3) {//rapidfire left and right of player (vertical line)
			this.size = new Pos(20, 35);
			this.speed = 0.3;
			this.health = 10;
		} else if (this.type === 4) { //fires radially
			this.size = new Pos(44, 30); //big horziontal line
			this.speed = 0.0;
			this.health = 10;
		} else if (this.type === 255) {
			this.size = new Pos(40, 40);
			this.speed = 0;
			this.health = 10;
		}
	}
	Enemy.prototype.getCenter = function () {
		var x = Math.floor(this.pos.x + this.size.x / 2);
		var y = Math.floor(this.pos.y + this.size.y / 2);
		return new Pos(x, y);
	}

	Enemy.prototype.update = function (player, audioUtil) {

		//move
		if (!this.dest) {
			this.dest = this.room.getRandomPointInside();
			this.angle = this.pos.angleTo(this.dest);
		}

		if (!this.stunned) {
			var xSpeed = (this.speed * Math.sin(3.14159 / 180.0 * this.angle));
			var ySpeed = (this.speed * -Math.cos(3.14159 / 180 * this.angle));
			this.pos.x += xSpeed;
			this.pos.y += ySpeed;

			if (this.pos.distanceTo(this.dest) < 16) {
				this.dest = null;
			}

			if (this.refireTimer == 0 && this.type < 255) {
				if (player) {

					if (this.type == 0) {
						//the seeking shot
						var angle = this.pos.angleTo(player.pos);
						var shot = new Shot(this.getCenter(), this.room, angle);
						this.room.shots.push(shot);
						this.refireTimer = 15;
					} else if (this.type == 1) {
						//the spinner shot
						this.fireAngle += 25;
						if (this.fireAngle > 360) this.fireAngle -= 360;
						var shot2 = new Shot(this.getCenter(), this.room, this.fireAngle);
						this.room.shots.push(shot2);
						this.refireTimer = 7;
					} else if (this.type == 2) {
						var angle = this.pos.angleTo(player.pos);
						for (var i = -2; i <= 2; i++) {
							this.room.shots.push(new Shot(this.getCenter(), this.room, angle + 10*i));
						}
						this.refireTimer = 15;
					} else if (this.type == 3) {
						var angle = this.pos.angleTo(player.pos);
						for (var i = -1; i <= 1; i+= 2) {
							this.room.shots.push(new Shot(this.getCenter(), this.room, angle + 40*i));
						}
						this.refireTimer = 8;
					} else {
						var angle = this.fireAngle;
						for (var i = 0; i < 360; i+= 30) {
							this.room.shots.push(new Shot(this.getCenter(), this.room, angle + i));
						}
						this.refireTimer = 30;
						this.fireAngle += 5;
						if (this.fireAngle > 360) this.fireAngle -= 360;
					}

				audioUtil.enemyAttack();

				}

			} else {
				this.refireTimer--;
			}

		}

		//duplicate code from Shot
		//update highlight status
		if (player && player.attackPowerOn(this) > this.health) {
			this.targetted = true;
		} else {
			this.targetted = false;
		}
	}

	Enemy.prototype.shocked = function (damage) {
		if (!this.live) return;
		if (damage > this.health) {
			this.health = 0;
			this.live = false;
			this.pos.floor();
			for (var x = this.pos.x; x < this.pos.x + this.size.x; x += 5) {
				for (var y = this.pos.y; y < this.pos.y + this.size.y; y += 5) {
					this.room.items.push(new Item(new Pos(x, y)));
				}
			}
		}
	}
	//End of Enemy.Prototype

	this.load = function () {
		var startTime = Date.now();
		var audioUtil = new AudioUtil();
		//audioUtil.playIntro();
		loadFiles(['shaders/fragment.glsl', 'shaders/vertex.glsl'], function (shaders) {
			start(shaders, audioUtil, startTime);
		}, function (url) {
		    alert('Failed to download "' + url + '"');
		});
	}

	//Warning: copied from, and must match, code in worldgenerator.js
	var makeKey = function (x, y) {
		return x + y * GameConsts.worldWidth;
	}

	var findRoomNear = function (xPercent, yPercent, rooms, cells) {
		var x = Math.floor(xPercent * GameConsts.worldWidth / 100);
		var y = Math.floor(yPercent * GameConsts.worldHeight / 100);
		//Find a room that is not already special.
		var attempts = 0;
		while (true) {
			var key = makeKey(x, y);
			var room = cells[key];
			if (room && !room.special) return room;
			x++;
			attempts++;
			if (attempts % 10 == 0) {
				x -= 10;
				y++;
			}
			if (attempts == 400) {
				console.log("Fatal Error: Could not find a room at " + xPercent + ", " + yPercent);
				return null;
			}
		}
	}

	var createSpecialItems = function (rooms, cells, goalRooms, audioUtil) {
		var firstRoom = rooms[0];
		firstRoom.special = true;

		var onHackFirstRoom = function (player) {
			player.story.hackedFirstRoom(player, audioUtil);
		}
		var controlPanel = new Item(
			firstRoom.getCenter().multiply(GameConsts.tileSize), 
			true, 
			"Hold [space] to break power box",
			"It's broken",
			onHackFirstRoom);
		firstRoom.items.push(controlPanel);

		goalRooms.forEach(function (room) {
			var onHackPortal = function (player) {
				console.log("Hacked a portal");
				portalsClosed++;
				if (portalsClosed >= 5) {
					player.story.won = true; //hacks omg
				}
			}
			var controlPanel = new Item(
				room.getCenter().multiply(GameConsts.tileSize), 
				true, 
				"Hold [space] to break the portal",
				"It's broken",
				onHackPortal);
			room.items.push(controlPanel);
		});

		return null;
	}

	//hasty globals
	var portalsClosed = 0;

	var start = function (shaders, audioUtil, startTime) {
		var gameWindow = new GameWindow();
		var renderer = new Renderer(gameWindow, GameConsts, shaders);
		var keyboard = new Keyboard();
		var camera = new Camera();
		var worldGenerator = new WorldGenerator(GameConsts, Enemy);

		//fps  counter
		var currentFps = 0;
		var framesThisSecond = 0;
		var thisSecond = 0;

		var roomData = worldGenerator.generate();
		var rooms = roomData.rooms;
		var specialItems = createSpecialItems(rooms, roomData.cells, roomData.goalRooms, audioUtil);
		roomData = null; //Free up the memory?

		var player = new Player();
		player.story = new Story(specialItems);

		var firstRoom = rooms[0];
		player.setHome(firstRoom);
		player.respawn();
		player.pos.y -= Math.floor((firstRoom.size.y - 3) * GameConsts.tileSize / 2);
		player.pos.x -= Math.floor((firstRoom.size.x - 3) * GameConsts.tileSize / 2);

		firstRoom.lockDoors();

		firstRoom.explored = true;
		player.roomsExplored++;

		var companion = null;

		var messages = new Messages(player, audioUtil, renderer.overlay);

		var update = function () {

			audioUtil.update();
			messages.update();

			player.story.update(messages, player, companion, audioUtil);

			player.room.update(player, audioUtil);
			if (player.lastRoom) player.lastRoom.update(player, audioUtil);

			player.update(keyboard, audioUtil, messages);
			if (companion) companion.update(player);

			//HACK: replace with a listener once we support listeners
			if (player.roomsExplored >= 7 && player.room != firstRoom && companion == null) {
				companion = new Companion(firstRoom);
			}

			keyboard.update();
		}

		//cross browser hacks
		var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  		window.requestAnimationFrame = requestAnimationFrame;

  		var tick = function () {
  			//logic
 			update();
			camera.pos.x = player.pos.x - gameWindow.width / 2 + GameConsts.tileSize / 2;
			camera.pos.y = player.pos.y - gameWindow.height / 2 + GameConsts.tileSize / 2;
 			//draw
			renderer.draw(player, companion, rooms, camera, currentFps);
			var newSecond = Math.floor(Date.now() / 1000);
			if (newSecond != thisSecond) {
				thisSecond = newSecond;
				currentFps = framesThisSecond;
				framesThisSecond = 0;
			}
			framesThisSecond++;
			requestAnimationFrame(tick);
  		};
  		requestAnimationFrame(tick);
		console.log("Game started " + (Date.now() - startTime) + " ms after the window loaded.");
	}

}

window.onload = function () {
	var cerulean = new Cerulean();
	cerulean.load();
};