var Cerulean = function () {

	var testing = false;

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
					if (msg.msg.length > 0) audioUtil.playAddMessage();
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
		this.update = function (messages, player, audioUtil) {

			if (this.won) {
				this.mode = "won";
				this.won = false; //it's a single use flag
				storyFrame = 0;
				messages.clearMessages();
			} else if (this.mode == "won") {
				storyFrame++;
				if (storyFrame == 0.5*sec) {
					messages.addMessage("", 4);
					messages.addMessage("Wherever you run, Britain will find you.", 3,
						function () {
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
				if (storyFrame == 0.0*sec) {
					audioUtil.playIntro();
					if (!testing) {
						messages.addMessage("", 2, null, true); //hardcoded Chapter 12, by Matthew Gatland
						messages.addMessage("Do you know what the aliens call you now?", 2);
					}
					messages.addMessage("The Troublemaker.", 2, function () {_this.startScreen = false;});
					messages.addMessage("Roaming the stars, upsetting the balance.", 3);
					messages.addMessage("Of course it took a human to catch you.", 3);
					messages.addMessage("", 1);
					messages.addMessage("I asked MI6 to scan your phone.", 3);
					messages.addMessage("We took your location history.", 3);
					messages.addMessage("My starpervs are opening gates to those coordinates.", 4);
					messages.addMessage("Soon, Britain's armies will invade those worlds.", 3);
					messages.addMessage("The UK will have colonies again!", 3);
					messages.addMessage("All thanks to you.", 3);
					messages.addMessage("Anyway, enough chit chat.", 2);
					messages.addMessage("I have wars to plan.", 2);
					messages.addMessage("", 1);
				}
				storyFrame++;
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

	var Enemy = function (pos, room) {
		extend(this, humanMixin);
		var _this = this;
		this.home = room;
		this.room = room;
		this.live = true;
		this.health = this.maxHealth;
		this.pos = pos;
		this.speed = 3;
		this.size = new Pos(20, 20);
		this.state = "wait";
		this.nextSearchRoom = null;
		this.oldSearchRoom = null;
		this.roomsSearched = 0;

		this.startRoom = this.room;
		this.startPos = this.pos.clone();

		var oldPath = null;
		var oldPathEnd = null;
		var oldPathStart = null;

		this.stunTarget = null;

		this._pathIsDirty = function (end) {
			return (this.room != oldPathStart || end != oldPathEnd);
		}

		var guessNextRoom = function(currentRoom) {
			var guesses = [];
			currentRoom.doors.forEach(function (door) {
				if (door.otherRoom != _this.oldSearchRoom && !door.otherRoom.locked) {
					guesses.push(door.otherRoom);
				}
			});
			if (guesses.length == 0) {
				return _this.oldSearchRoom; //have to backtrack
			} else {
				return guesses[Math.floor(Math.random() * guesses.length)];	
			}
		}

		this.update = function (player, audioUtil) {
			if (this.state === "frozen") return;
			if (resetGuards) {
				this.state = "search";
				this.speed = 1;
				this.roomsSearched = 4; //will keep speed to 1
				this.pos = this.startPos.clone();
				this.room = this.startRoom;
				this.oldSearchRoom = this.room;
				this.nextSearchRoom = null;
			}
			if (this.room == player.room) {
				this.state = "see";
				this.speed = 3;
				this._moveTowards(player.pos, "horizontal");
				this._moveTowards(player.pos, "vertical");

				//hurt player if touching
				if (this.pos.x < player.pos.x + player.size.x
					&& this.pos.y < player.pos.y + player.size.y
					&& player.pos.x < this.pos.x + this.size.x
					&& player.pos.y < this.pos.y + this.size.y
					) {
					player.hit(audioUtil);
				}

			} else {
				if (loudRoom != null) {
					this.state = "goto";
					this.speed = 3;
					this.nextSearchRoom = loudRoom;
				}
				if (this.state === "wait") {
					//nothing
				} else if (this.state === "see") {
					//we just lost them
					this.nextSearchRoom = player.room;
					this.oldSearchRoom = this.room;
					this.roomsSearched = 0;
					this.state = "search";
					this.speed = 3;
				}

				if (this.state === "search") {
					if (this.room == this.nextSearchRoom) {
						this.roomsSearched++;
						if (this.roomsSearched > 2) {
							//getting tired.
							this.speed = 2;
						}
						if (this.roomsSearched > 4) {
							this.speed = 1;
						}
						//guess where she went next
						this.nextSearchRoom = guessNextRoom(this.room);
						//never backtrack to here
						this.oldSearchRoom = this.room;
					} else {
						//go to next room
						var doorToUse = this.room.doors.filter(function (door) {
							return door.otherRoom === _this.nextSearchRoom;
						}).pop();

						//bug, happens when player respawns away in front of an enemy
						//their nextSearchRoom becomes the respawn point (not good)
						if (doorToUse == null) {
							//pick a random room, then the door to it
							this.nextSearchRoom = guessNextRoom(this.room);
							var doorToUse = this.room.doors.filter(function (door) {
								return door.otherRoom === _this.nextSearchRoom;
							}).pop();
						}
						moveToDoorway(doorToUse);
					}
				}

				if (this.state === "goto") {
					if (this.room === this.nextSearchRoom) {
						this.state = "search";
					} else {
						this.oldSearchRoom = this.room; //to avoid backtracking at the end
						var path = this._pathIsDirty(this.nextSearchRoom) ? this.room.getPathTo(this.nextSearchRoom) : oldPath;
						oldPath = path;
						oldPathEnd = this.nextSearchRoom;
						oldPathStart = this.room;

						var doorToUse = this.room.doors.filter(function (door) {
							return door.otherRoom === path[0];
						}).pop();
						moveToDoorway(doorToUse);						
					}
				}
			}
			this._updateCurrentRoom();
		};

		var moveToDoorway = function(doorToUse) {
			var moveDest = doorToUse.getCenter();
			if (doorToUse.overlaps(_this)) {
				moveDest = doorToUse.getFarSidePos();
			} else {
				moveDest = doorToUse.getNearSidePos();
			}
			_this._moveTowards(moveDest, "horizontal");
			_this._moveTowards(moveDest, "vertical");
		}

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
		this.attackChargeLimit = testing ? 15 : this.maxAttackCharge;

		this.canUseDoors = true;
		this.canAttack = false;
		this.teleBeamWidth = 0;

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
			//hack to position next to the bars of the cell
			this.pos.x += 30;
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

		this._updateMovement = function (keyboard, frozen) {
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

			if (!frozen) {
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
		}

/*		this.attack = function (roomToAttack, audioUtil) {
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
*/

		this._updateAttackCharge = function (keyboard, audioUtil) {
			if (this.health > 0) {
				if (isChargingAttack) {
					this.attackCharge++;
					if (this.attackCharge > this.attackChargeLimit) {
						this.attackCharge = this.attackChargeLimit;
					}
				} else {
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
					resetGuards = true;
					//prison hacks
					this.room.locked = true;
					this.room.items[0].reset();
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
			var frozen = (this.story.mode === "won");
			this._updateMovement(keyboard, frozen);
			this._updateAttackCharge(keyboard, audioUtil);
			this._updateHealthAndShield();

			var roomsPreviouslyExplored = this.roomsExplored;
			this._updateCurrentRoom(audioUtil, messages);
			if (this.roomsExplored > roomsPreviouslyExplored) {

			}

			//update item interactions
			this.itemHint = null;
			var itemDist = 999999;
			this.canAttack = false;
			if (!frozen) {
				this.room.items.forEach(function (item) {
					if (item.getCenter().distanceTo(_this.getCenter()) < item.size.x / 2 + _this.size.x / 2 + 10) {
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

			if (frozen) {
				this.teleBeamWidth += 0.20;
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
				this.invlunerableTime = 15;
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

	var Item = function (name, pos, special, description, afterDescription, onCollected) {
		this.name = name;
		this.live = true;
		this.canBeUsed = true;
		this.pos = pos;
		this.special = special ? true : false;
		this.description = description;
		this.beforeDescription = description;
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

		this.reset = function () {
			this.canBeUsed = true;
			this.description = this.beforeDescription + " (again)";
		}

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
			player.room.flashing = 20;
		}
		var controlPanel = new Item("doorcontrols",
			firstRoom.pos.clone().multiply(GameConsts.tileSize).moveXY(GameConsts.wallWidth, GameConsts.wallWidth), 
			true, 
			"Hold [space] to break door controls",
			"You unlocked the door.",
			onHackFirstRoom);
		firstRoom.items.push(controlPanel);

		goalRooms[0].spawnEnemy();
		goalRooms[2].spawnEnemy();
		goalRooms[4].spawnEnemy();
		goalRooms.forEach(function (room) {
			var onHackPortal = function (player) {
				console.log("Hacked a portal");
				portalsClosed++;
				if (portalsClosed >= 5 || (testing && portalsClosed >= 1)) {
					player.story.won = true; //hacks omg
					audioUtil.playEnding();
				} else {
					audioUtil.playGotItem(1);
				}
				loudRoom = player.room;
				player.room.flashing = 40;
			}
			var controlPanel = new Item("portal",
				room.getCenter().multiply(GameConsts.tileSize), 
				true, 
				"Hold [space] to break the star gate",
				"It's broken",
				onHackPortal);
			room.items.push(controlPanel);
		});

		return null;
	}

	//hasty globals
	var portalsClosed = 0;
	var loudRoom = null;
	var resetGuards = false;

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
		firstRoom.lockDoors();

		firstRoom.explored = true;
		player.roomsExplored++;

		var messages = new Messages(player, audioUtil, renderer.overlay);

		var update = function () {
			audioUtil.update();
			messages.update();

			player.story.update(messages, player, audioUtil);

			rooms.forEach(function (room) {
				if (player.story.mode === "won") {
					room.enemies.forEach(function (enemy) {
						enemy.state = "frozen";
					});
				};
				room.update(player, audioUtil);
			});

			//reset hasty globals every frame
			loudRoom = null;
			resetGuards = false;
			player.update(keyboard, audioUtil, messages);

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
			renderer.draw(player, rooms, camera, currentFps);
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