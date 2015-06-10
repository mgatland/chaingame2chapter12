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

		this.addMessage = function (msg, delay, func) {
			messageQueue.push({msg:msg, delay:delay, func:func});
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
				if (msgRenderer.canAddMessage(player.room, msg.msg)) {
					messageQueue.shift();
					audioUtil.playAddMessage();
					if (!player.room.messages) player.room.messages = [];
					player.room.messages.push(msg.msg);
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

		this.mode = "intro"; //cannot pass through doorways, do not show HUD.
		this.shaking = false;

		var sec = 60; //just a constant

		var storyFrame = 0;
		this.update = function (messages, player, companion, audioUtil) {

			var quietAndTogether = (companion && player.room === companion.room && player.room.enemies.length === 0);

			if (this.mode == "intro") {
				storyFrame++;
				if (storyFrame == 0.5*sec) {
					for (var i = 0; i < 10; i++) {
						messages.addMessage("", 0);	
					}
					messages.addMessage("Use arrow keys to move", 1);
				}

			} else if (this.mode === "intro2") {
				storyFrame++;
				if (storyFrame == 0.5*sec) {
					messages.addMessage("Hold space to charge", 1);
				}
				if (player.room.countEnemies() === 0) {
					this.clearedFirstRoom(player, audioUtil);
				}
			} else if (this.mode === "game1") {
				if (storyFrame == 0) {
					messages.clearMessages();
					player.room.messages.length = 0; //HACK: delete the intro text
				}
				storyFrame++;
				if (storyFrame == 2*sec) {
					messages.addMessage("WHAT HAVE YOU DONE?", 1);
					messages.addMessage("GET OUT!", 2);
					messages.addMessage("GET OUT!", 20);
					messages.addMessage("Insect.", 2);
					messages.addMessage("I have slept for two thousand years.", 5);
					messages.addMessage("I should have slept for thousands more.", 4);
					messages.addMessage("You've ruined everything.", 20);
					messages.addMessage("I will have to wait for my family to rise.", 4);
					messages.addMessage("Do you know what it's like?", 3);
					messages.addMessage("To wait thousands of years?", 3);
					messages.addMessage("Of course you don't.", 2);
					messages.addMessage("Mortal.", 2);
					messages.addMessage("Insect.", 2);
					messages.addMessage("You can't understand how horrible it is.", 5);
					messages.addMessage("Your life is short and worthless.", 2);
					messages.addMessage("I'll kill you today.", 2);
					messages.addMessage("But I will still be suffering long after your name is forgotten.", 20);
				}
				if (storyFrame == 7*sec) this.shaking = false;

				if (quietAndTogether && this.shaking == false) {
					this.mode = "game2";
					storyFrame = 0;
				}

			} else if (this.mode === "game2") {
				if (storyFrame == 0) messages.clearMessages();
				storyFrame++;
				if (storyFrame == 1*sec) {
					messages.addMessage("Stranger: Hello!", 1);
					messages.addMessage("Justin: What are you doing here? It's not safe!", 1);
					messages.addMessage("Stranger: I noticed!", 2);
					messages.addMessage("Stranger: I'm Anna Harpin. I study Pharos artifacts.", 2);
					messages.addMessage("Anna: Something teleported me in from my lab.", 2);
					messages.addMessage("Justin: I'm Justin.", 1);
					messages.addMessage("Justin: I'm an artifact retrieval specialist.", 2);
					messages.addMessage("Justin: I've lost contact with HQ. Do you know a way out?", 2);
					messages.addMessage("Anna: Not exactly. But I can help - this is a Wand of Justice.", 2);
					//TODO: Don't allow the story to skip messages that call functions!
					var revealWandFunc = function () {
						companion.wandTarget = specialItems.collector;
					}
					messages.addMessage("Anna: The Wand points towards powerful artifacts.", 2, revealWandFunc);
					messages.addMessage("Anna: It can lead us to Pharos devices that will help us.", 2);
					messages.addMessage("Justin: Nice! OK, let's see what we can find.", 8);

					//Amulet of Might

					messages.addMessage("Anna: I see you already found the Amulet of Might.", 2);
					messages.addMessage("Justin: Is that what this weapon is called?", 1);
					messages.addMessage("Anna: It's far more than a weapon!", 2);
					messages.addMessage("Anna: If you're about to be killed, it will teleport you back to where you found it.", 2);
					messages.addMessage("Anna: Nothing can ever kill you while you hold it.", 2);
					messages.addMessage("Justin: Wow.", 2);
					messages.addMessage("Anna: It should protect me too, while I'm with you.", 2);
					messages.addMessage("Anna: So I hope you don't mind me keeping close :)", 8);

				}
			} else if (this.mode === "game3") {
				if (storyFrame == 0) messages.clearMessages();
				storyFrame++;
				if (storyFrame == 0.5*sec) {
					messages.addMessage("Justin: Looks like a bracelet.", 2);
					messages.addMessage("Anna: The Calling Circle. It draws energy out of the automatons, as you destroy them.", 4);
					messages.addMessage("Justin: What can I do with that energy?", 2);
					messages.addMessage("Anna: I don't know. I guess we'll find out.", 6);



					var findEyesFunc = function () {
						companion.wandTarget = specialItems.eyes;
					}

					messages.addMessage("Anna: The wand is locating another artifact.", 2);
					messages.addMessage("Anna: There!", 8, findEyesFunc);

					//Wand of Justice
					messages.addMessage("Justin: What is that wand you're using?", 2);
					messages.addMessage("Anna: The Wand of Justice.", 2);
					messages.addMessage("Anna: The Pharos King's men used them to find and steal people's valuable treasures.", 2);
					messages.addMessage("Anna: It can also freeze the automatons.", 2);
					messages.addMessage("Justin: You know, when we get out of here, you'll have to give that to me.", 2);
					messages.addMessage("Anna: What?! It's mine!", 1);
					messages.addMessage("Justin: Everything in this labyrinth belongs to my employer.", 2);
					messages.addMessage("Anna: I didn't find it in the labyrinth!", 1);
					messages.addMessage("Anna: I brought it in with me.", 3);
					messages.addMessage("Justin: ...", 1);
					messages.addMessage("Justin: I thought you were teleported in by accident.", 2);
					messages.addMessage("Anna: I was holding the wand when it happened. It's from my lab.", 2);
					messages.addMessage("Justin: Oh.", 2);
					messages.addMessage("Anna: In fact, that's probably why I was pulled in.", 6);
				}
			} else if (this.mode === "game4") {
				if (storyFrame == 0) messages.clearMessages();
				storyFrame++;


				if (storyFrame == 0.5*sec) {
					messages.addMessage("Anna: We can't use those.", 2);
					messages.addMessage("Anna: They're called the Eyes of Devotion.", 2);
					messages.addMessage("Anna: They let two people read each other's minds.", 2);
					messages.addMessage("Justin: That sounds useful, if we get separated.", 1);
					messages.addMessage("Anna: No way! It's permanent.", 2);
					messages.addMessage("Anna: You'd be in my head forever.", 2);
					messages.addMessage("Justin: Oh. Doesn't sound so bad...", 2);
					messages.addMessage("Anna: We are not using those.", 2);
					messages.addMessage("Anna: Anyway, they're worthless once activated, so your company would be angry if we wasted them.", 2);
					messages.addMessage("Justin: My boss would want us to get out safely.", 2);
					messages.addMessage("Justin: But OK. I'll hang on to them.", 3);
					messages.addMessage("Anna: Actually, give me one, just in case.", 3);
					messages.addMessage("Anna: If something really bad happens, we can activate them.", 3);
					messages.addMessage("Justin: OK.", 3);
					messages.addMessage("(You gave Anna one of the Eyes of Devotion.)", 3);
					messages.addMessage("Anna: I'll find our next destination.", 3);

					//TODO add destination here

					messages.addMessage("Voice: WHO DARES WAKE ME?", 3);

					var that = this;
					messages.addMessage("Anna: Um. This is awkward.", 1, function() {
						that.mode = "unfinished_ending";
						that.storyFrame = 0;
					});
				}
				/*if (storyFrame == 1*sec) {
					this.mode = "unfinished_ending";
					storyFrame = 0;
				}*/

			} else if (this.mode === "unfinished_ending") {

				if (storyFrame == 0) messages.clearMessages();
				storyFrame++;
				if (storyFrame == 0.5*sec) {
					//make sure players know to stop now.
					messages.addMessage("Anna: Actually", 2);
					messages.addMessage("Anna: This is the end of the game.", 2);
					messages.addMessage("Justin: What?!", 2);
					messages.addMessage("Anna: The game's not finished yet, and this is the end.", 2);
					messages.addMessage("Anna: We can keep exploring, but we're not going to find any more artifacts.", 2);
					messages.addMessage("Justin: You mean, we can't escape?", 2);
					messages.addMessage("Anna: I'm afraid not.", 4);
					messages.addMessage("Justin: So...", 2);
					messages.addMessage("Anna: Yeah.", 4);
					messages.addMessage("Justin: We could try to find the edge of the world.", 3);
					messages.addMessage("Anna: That could be fun.", 2);
					messages.addMessage("Anna: But nothing will happen when we get there.", 2);
					messages.addMessage("Anna: I mean, I'm not even going to say anything.", 2);
					messages.addMessage("Anna: This is the end of the talking.", 2);
					messages.addMessage("Justin: OK.", 9);
					messages.addMessage("Justin: So...", 1);
					messages.addMessage("Anna: No more talking!", 10);
					messages.addMessage("THE END", 1);
				}
			}
		}

		this.roomsExplored = function (amount, messages) {
			//console.log("Rooms " + amount);
			//if (amount == 3) messages.addMessage("Justin: The rooms were all empty before.");
			//if (amount == 4) messages.addMessage("Justin: I must have woken up the defence system.");
		}

		this.gotFirstAttackItem = function (player, audioUtil) {
			if (this.mode == "intro") {
				this.mode = "intro2";
				storyFrame = 0;
				player.canAttack = true;
				player.canUseDoors = true;
				player.room.lockDoors();
				player.room.spawnTowers();
				audioUtil.playGotItem();
			}
		}

		this.clearedFirstRoom = function (player, audioUtil) {
			if (this.mode === "intro2") {
				this.mode = "game1";
				storyFrame = 0;
				this.shaking = true;
				audioUtil.playIntro();
			}
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

		this.roomsExplored = 0;

		this.invlunerableTime = 0;
		this.shieldRechange = 0;
		this.home = null;
		this.items = 0;

		this.attackCharge = 0;
		this.maxAttackCharge = 5 * 60;
		this.attackChargeLimit = this.maxAttackCharge / 4;

		this.canUseDoors = false;
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

	var Item = function (pos, special) {
		this.live = true;
		this.pos = pos;
		this.special = special ? true : false;
		if (this.special) {
			this.size = new Pos(32, 32);
		} else {
			this.size = new Pos(2, 2);
		}
		this.onCollected = null;

		this.update = function (player, audioUtil) {
			if (player) {
				var distance = this.pos.distanceTo(player.getCenter());
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
			}
		};
	}

	var Enemy = function (pos, room, type) {
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

	var createSpecialItems = function (rooms, cells, audioUtil) {
		var firstRoom = rooms[0];
		firstRoom.special = true;
		var attackItem = new Item(firstRoom.getCenter().multiply(GameConsts.tileSize), true);
		attackItem.pos.x += 16;
		attackItem.pos.y += 16;
		attackItem.onCollected = function (player) {
			player.story.gotFirstAttackItem(player, audioUtil);
		}
		firstRoom.items.push(attackItem);

		//  0      33      67     100
		//         |        |
		//         |        |
		// 33------+--------+---------
		//         |        |C
		//         |    A   |
		//         |      B |
		// 67------+--------+---------
		//         |        |
		//         |        |
		//100      |        |

		//A - firstRoom
		//B - green collector
		//C - the eyes

		var itemCollectorRoom = findRoomNear(58, 58, rooms, cells);
		itemCollectorRoom.special = true;
		var collectorItem = new Item(itemCollectorRoom.getCenter().multiply(GameConsts.tileSize), true);
		collectorItem.pos.moveXY(16, 16);
		collectorItem.onCollected = function (player) {
			player.story.gotCollectorItem(player);
		}
		itemCollectorRoom.enemies = [];
		itemCollectorRoom.items.push(collectorItem);


		var eyesRoom = findRoomNear(40, 70, rooms, cells);
		eyesRoom.special = true;
		var eyesItem = new Item(eyesRoom.getCenter().multiply(GameConsts.tileSize), true);
		eyesItem.pos.moveXY(16,16);
		eyesItem.onCollected = function (player) {
			player.story.gotEyesItem(player);
		}
		eyesRoom.enemies = [];
		eyesRoom.items.push(eyesItem);

		return {collector: collectorItem, eyes: eyesItem};
	}

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
		var specialItems = createSpecialItems(rooms, roomData.cells, audioUtil);
		roomData = null; //Free up the memory?

		var player = new Player();
		player.story = new Story(specialItems);

		var firstRoom = rooms[0];
		player.setHome(firstRoom);
		player.respawn();
		player.pos.y -= Math.floor((firstRoom.size.y - 3) * GameConsts.tileSize / 2);
		player.pos.x -= Math.floor((firstRoom.size.x - 3) * GameConsts.tileSize / 2);

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