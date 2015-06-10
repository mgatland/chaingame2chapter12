var WorldGenerator = function (gameConsts, Enemy) {

	var Door = function (x, y, otherRoom, direction) {
		this.pos = new Pos(x,y);
		this.otherRoom = otherRoom;
		this.direction = direction;
	}
	Door.prototype.overlaps = function (rect) {
		var x = this.pos.x * gameConsts.tileSize;
		var y = this.pos.y * gameConsts.tileSize;
		return (x < rect.pos.x + rect.size.x
			&& x + gameConsts.tileSize > rect.pos.x
			&& y < rect.pos.y + rect.size.y
			&& y + gameConsts.tileSize > rect.pos.y);
	}

	Door.prototype.getCenter = function () {
		var x = Math.floor(this.pos.x * gameConsts.tileSize + gameConsts.tileSize / 2);
		var y = Math.floor(this.pos.y * gameConsts.tileSize + gameConsts.tileSize / 2);
		return new Pos(x, y);
	}

	Door.prototype.getNearSidePos = function () {
		return this.getCenter().moveInDir(this.direction.reverse, 12);
	}

	Door.prototype.getFarSidePos = function () {
		return this.getCenter().moveInDir(this.direction, 32);
	}
	//end of Door.prototype

	var nextRoomId = 0;
	var Room = function (x, y, width, height, zone) {
		this.id = nextRoomId;
		nextRoomId++;
		this.pos = new Pos(x, y);
		this.size = new Pos(width, height);
		this.zone = zone;
		this.doors = [];
		this.enemies = [];
		this.shots = [];
		this.items = [];
	}

	Room.prototype.lockDoors = function () {
		this.locked = true;
	}

	Room.prototype.update = function (player, audioUtil) {
		if (this.flashing) this.flashing--;

		this.shots = this.shots.filter(function (s) {return s.live});
		this.enemies = this.enemies.filter(function (e) {return e.live});
		this.items = this.items.filter(function (i) {return i.live});

		this.enemies.forEach(function (enemy) {
			enemy.update(player, audioUtil);
		});

		this.shots.forEach(function (shot) {
			shot.update(player, audioUtil);
		});

		this.items.forEach(function (item) {
			item.update(player, audioUtil);
		});

		if (!player.canCollectGreenDots) {
			if ((player.room === this || player.lastRoom === this) && this.items.length > 0) {
				var room = this;
				var liveItems = this.items.filter(function (item) {
					if (item.special) return false;
					if (item.live) return true;
					return false;
				});
				if (liveItems.length > 0) liveItems[0].live = false;
			}
		}

		if (this.locked && this.countEnemies() === 0) {
			this.locked = false;
		}
	}

	//called when the player leaves a room
	Room.prototype.cleanUp = function () {
		this.shots = [];
	}

	//generation time only
	Room.prototype.addDoor = function (x, y, otherRoom, direction) {
		this.doors.push(new Door(x,y, otherRoom, direction));
	}

	Room.prototype.getCenter = function () {
		var x = this.pos.x + this.size.x / 2;
		var y = this.pos.y + this.size.y / 2;
		return new Pos(Math.floor(x), Math.floor(y));
	}

	Room.prototype.toString = function () {
		return "Room " + this.pos + "|" + this.size;
	};

	Room.prototype._isCollidingWithPoint = function (x, y, blockDoorways) {
		if (!this._containsPos(x, y)) return false;
		var gridX = x / gameConsts.tileSize;
		var gridY = y / gameConsts.tileSize;
		var wallWidth = gameConsts.wallWidth / gameConsts.tileSize;
		var leftWall = (gridX < this.pos.x + wallWidth);
		var rightWall = (gridX >= this.pos.x + this.size.x - wallWidth);
		var upWall = (gridY < this.pos.y + wallWidth);
		var downWall = (gridY >= this.pos.y + this.size.y - wallWidth);
		if (leftWall || rightWall || upWall || downWall) {

			//it's wall unless it's a door.
			if (blockDoorways) return true;
			var gridXfloored = Math.floor(gridX);
			var gridYfloored = Math.floor(gridY);
			return !(this.doors.some(function (door) {
				return (gridXfloored == door.pos.x && gridYfloored == door.pos.y);
			}));
		}
		return false;
	}

	Room.prototype._containsPos = function (x, y) {
		var gridX = Math.floor(x / gameConsts.tileSize);
		var gridY = Math.floor(y / gameConsts.tileSize);
		return (this.pos.x <= gridX && this.pos.x + this.size.x > gridX
			&& this.pos.y <= gridY && this.pos.y + this.size.y > gridY);
	}

	Room.prototype.containsCenterOf = function (player) {
		return (this._containsPos(player.pos.x+player.size.x/2, player.pos.y+player.size.y/2));
	}

	Room.prototype.containsAllOf = function (player) {
		if (!this._containsPos(player.pos.x, player.pos.y)) return false;
		if (!this._containsPos(player.pos.x+player.size.x, player.pos.y)) return false;
		if (!this._containsPos(player.pos.x+player.size.x, player.pos.y+player.size.y)) return false;
		if (!this._containsPos(player.pos.x, player.pos.y+player.size.y)) return false;
		return true;
	}

	Room.prototype.containsSomeOf = function (player) {
		if (this._containsPos(player.pos.x, player.pos.y)) return true;
		if (this._containsPos(player.pos.x+player.size.x, player.pos.y)) return true;
		if (this._containsPos(player.pos.x+player.size.x, player.pos.y+player.size.y)) return true;
		if (this._containsPos(player.pos.x, player.pos.y+player.size.y)) return true;
		return false;
	}

	Room.prototype._isTileCollidingWith = function (x, y, thing, blockDoorways) {
		var typeType;
		var left = (x == this.pos.x);
		var right = (x == this.pos.x + this.size.x - 1);
		var up = (y == this.pos.y);
		var down = (y == this.pos.y + this.size.y - 1);

		if (!left && !right && !up && !down) return false; //floor never collides

		if (!blockDoorways) {
			var doorway = this.doors.some(function (d) {
				return d.pos.x == x && d.pos.y == y;
			});
			if (doorway) return false;
		}

		var hitWall = false;
		if (left) {
			hitWall = hitWall || (thing.pos.x < x * gameConsts.tileSize + gameConsts.wallWidth);
		}
		if (right) {
			hitWall = hitWall || (thing.pos.x + thing.size.x > (x+1) * gameConsts.tileSize - gameConsts.wallWidth);
		}
		if (up) {
			hitWall = hitWall || (thing.pos.y < y * gameConsts.tileSize + gameConsts.wallWidth);
		}
		if (down) {
			hitWall = hitWall || (thing.pos.y + thing.size.y > (y+1) * gameConsts.tileSize - gameConsts.wallWidth);
		}
		return hitWall;
	};

	//Is this thing colliding with the walls of the room?
	Room.prototype.isCollidingWith = function (thing, blockDoorways) {

		if (this.locked || thing.canUseDoors === false) blockDoorways = true;

		if (thing.size) {
			var minTileX = Math.floor(thing.pos.x / gameConsts.tileSize);
			var maxTileX = Math.floor((thing.pos.x + thing.size.x) / gameConsts.tileSize);
			var minTileY = Math.floor(thing.pos.y / gameConsts.tileSize);
			var maxTileY = Math.floor((thing.pos.y + thing.size.y) / gameConsts.tileSize);
			for (var x = minTileX; x <= maxTileX; x++) {
				for (var y = minTileY; y <= maxTileY; y++) {
					if (this._isTileCollidingWith(x, y, thing, blockDoorways)) return true;
				}
			}
			return false;
		} else {
			if (this._isCollidingWithPoint(thing.pos.x, thing.pos.y, blockDoorways)) return true;
		}
		return false;
	};

	Room.prototype.getRandomPointInside = function () {
		var x = rand(this.pos.x + 1, this.pos.x + this.size.x - 1);
		var y = rand(this.pos.y + 1, this.pos.y + this.size.y - 1);
		return new Pos(x * gameConsts.tileSize, y * gameConsts.tileSize);
	}

	Room.prototype.countEnemies = function () {
		return this.enemies.filter(function (e) {return e.live}).length;
	}

	Room.prototype.getNeighbours = function () {
		var neighbours = [];
		this.doors.forEach(function (door) {
			neighbours.push(door.otherRoom);
		});
		return neighbours;
	}

	var spawnTower = function (x, y, room) {
		var pos = new Pos(x * gameConsts.tileSize, y * gameConsts.tileSize);
		var tower = new Enemy(pos, room, 255);
		room.enemies.push(tower);
	}

	Room.prototype.spawnTowers = function () {
		spawnTower(this.pos.x + 1, this.pos.y + 1, this);
		spawnTower(this.pos.x + 1, this.pos.y + this.size.y - 2, this);
		spawnTower(this.pos.x + this.size.x - 2, this.pos.y + this.size.y - 2, this);
		spawnTower(this.pos.x + this.size.x - 2, this.pos.y + 1, this);
	}

	Room.prototype.getPathTo = function (destRoom) {
		var maxSteps = 9000;
		var steps = 0;

		//fitness function for pathfinding
		var fitnessFunc = function (node, destination) {
			var distScore = node.room.pos.distanceTo(destRoom.pos);
			var exploredScore = node.room.explored ? 0 : 10;
			return distScore + exploredScore; //lower is better
		};

		if (this === destRoom) return destRoom;
		var openList = [];
		var closedList = [];
		openList.push({room: this, prev: null});

		while (openList.length > 0) {

			steps++;
			if (steps == maxSteps) {
				console.log("Error in pathfinding");
				return destRoom;
			}
			if (steps % 500 == 0) { //logging if somethig has gone wrong
				console.log("Pathfinding has taken " + steps + " steps...");
				console.log("Open rooms: " + openList.length);
				console.log("Closed rooms: " + closedList.length);
			}

			// Grab the best node to process next
			var lowInd = 0;
			var lowVal = fitnessFunc(openList[0], destRoom);
			for(var i=0; i<openList.length; i++) {
				var fitness = fitnessFunc(openList[i], destRoom);
				if(fitness < lowVal) {
					lowInd = i;
					lowVal = fitness
				}
			}
			var currentNode = openList[lowInd];
			openList.splice(lowInd, 1);

			// success
			if(currentNode.room === destRoom) {
				var curr = currentNode;
				var ret = [];
				while(curr.prev) {
					ret.push(curr.room);
					curr = curr.prev;
				}
				return ret.reverse();
			}

 			closedList.push(currentNode);

			var neighbours = currentNode.room.getNeighbours();

			neighbours.forEach(function (room) {
				//Add the room, if it is not already on any list
				if (openList.some(function (node) {return node.room === room})) {
					return;
				}
				if (closedList.some(function (node) {return node.room === room})) {
					return;
				}
				openList.push({room: room, prev: currentNode});
			});
		}
	}

	//end of Room prototype methods

	var addDoorsBetween = function (room, newRoom, direction) {
		var minX;
		var maxX;
		switch (direction) {
			case Dir.UP:
			case Dir.DOWN:
				minX = Math.max(newRoom.pos.x + 1, room.pos.x + 1);
				maxX = Math.min(newRoom.pos.x + newRoom.size.x - 2, room.pos.x + room.size.x - 2);
				break;
			case Dir.LEFT:
				minX = room.pos.x;
				maxX = minX;
				break;
			case Dir.RIGHT:
				minX = room.pos.x + room.size.x - 1;
				maxX = minX;
				break;
			break;
		}
		var minY;
		var maxY;
		switch (direction) {
			case Dir.LEFT:
			case Dir.RIGHT:
				minY = Math.max(newRoom.pos.y + 1, room.pos.y + 1);
				maxY = Math.min(newRoom.pos.y + newRoom.size.y - 2, room.pos.y + room.size.y - 2);
				break;
			case Dir.UP:
				minY = room.pos.y;
				maxY = minY;
				break;
			case Dir.DOWN:
				minY = room.pos.y + room.size.y - 1;
				maxY = minY;
				break;
			break;
		}
		var x = Math.floor(minX + Math.random() * (maxX - minX));
		var y = Math.floor(minY + Math.random() * (maxY - minY));
		room.addDoor(x, y, newRoom, direction);
		switch (direction) {
			case Dir.LEFT:
				x--;
				break;
			case Dir.RIGHT:
				x++;
				break;
			case Dir.UP:
				y--;
				break;
			case Dir.DOWN:
				y++;
				break;
		}
		newRoom.addDoor(x, y, room, direction.reverse);
	};

	var roomCollidesWith = function (room, x, y, width, height) {
		return (room.pos.x < x + width && room.pos.x + room.size.x > x
			&& room.pos.y < y + height  && room.pos.y + room.size.y > y);
	}

	var rand = function (min, max) {
		return Math.floor(Math.random() * (max-min) + min);
	}

	var getRoomZone = function (startRoom, direction, worldWidth, worldHeight) {
		var pos = startRoom.pos.clone();
		switch (direction) {
			case Dir.UP:
				pos.x += startRoom.size.x/2;
			break;
			case Dir.DOWN:
				pos.x += startRoom.size.x/2;
				pos.y += startRoom.height/2;
			break;
			case Dir.LEFT:
				pos.y += startRoom.size.y/2;
			break;
			case Dir.RIGHT:
				pos.y += startRoom.size.y/2;
				pos.x += startRoom.width;
			break;
		}
		pos.x /= worldWidth;
		pos.y /= worldWidth;
		if (pos.x < 0.33 || pos.x > 0.66) return "far";
		if (pos.y < 0.33 || pos.y > 0.66) return "far";
		return "center";

	}

	var addRoom = function (startRoom, direction, openRooms, filledCells, worldWidth, worldHeight) {
		var width;
		var height;
		var maxExpansions;
		var hallway = false;

		var zone = getRoomZone(startRoom, direction, worldWidth, worldHeight);

		var randRoomValue = rand(0, 100);
		if (randRoomValue < 95) { //normal or jumbo rooms
			width = 5;
			height = 5;
			maxExpansions = rand(0,100) < 70 ? rand(5,6) : 15;
		} else { //hallway rooms
			hallway = true;
			if (rand(0,2) == 1) {
				width = 3;
				height = 6;
			} else {
				width = 6;
				height = 3;
			}
			maxExpansions = 9;
		}

		var x;
		var y;
		switch (direction) {
			case Dir.UP:
				x = rand(startRoom.pos.x-width+3, startRoom.pos.x + startRoom.size.x - 3);
				y = startRoom.pos.y - height;
			break;
			case Dir.DOWN:
				x = rand(startRoom.pos.x-width+3, startRoom.pos.x + startRoom.size.x - 3);
				y = startRoom.pos.y + startRoom.size.y;
			break;
			case Dir.LEFT:
				x = startRoom.pos.x - width;
				y = rand(startRoom.pos.y-height+3, startRoom.pos.y + startRoom.size.y - 3);
			break;
			case Dir.RIGHT:
				x = startRoom.pos.x + startRoom.size.x;
				y = rand(startRoom.pos.y-height+3, startRoom.pos.y + startRoom.size.y - 3);
			break;
		}
		if (x < 0 || y < 0 || x > worldWidth || y > worldHeight) return;

		//Find nearby closed rooms

		var nearbyRooms = findExistingRoomsInArea(filledCells, x-maxExpansions-1, y-maxExpansions-1, width+maxExpansions*2+2, height+maxExpansions*2+2);

		//Are we already colliding? If so, abort, this room will never fit.
		if (nearbyRooms.some(function (room) {
			return roomCollidesWith(room, x, y, width, height);
		})) return;

		//direction we can expand:
		var expansions = [Dir.LEFT, Dir.RIGHT, Dir.UP, Dir.DOWN];

		//special rules for hallways - never get wider
		if (hallway) {
			if (width > height) {
				expansions = [Dir.LEFT, Dir.RIGHT];
			} else {
				expansions = [Dir.UP, Dir.DOWN];
			}
		}

		var expansionCount = 0;
		while (expansions.length > 0 && expansionCount < maxExpansions) {
			var rnd = rand(0, expansions.length);
			var rndDir = expansions[rnd];
			switch(rndDir) {
				case Dir.UP:
					if (nearbyRooms.some(function (room) {
						return roomCollidesWith(room, x, y - 1, width, 1);
					}) || y == 0) {
						expansions = expansions.filter(function (e) {return e != rndDir});
					} else {
						y--;
						height++;
						expansionCount++;
					}
					break;
				case Dir.DOWN:
					if (nearbyRooms.some(function (room) {
						return roomCollidesWith(room, x, y + height, width, 1);
					}) || y + height == worldHeight) {
						expansions = expansions.filter(function (e) {return e != rndDir});
					} else {
						height++;
						expansionCount++;
					}
					break;
				case Dir.LEFT:
					if (nearbyRooms.some(function (room) {
						return roomCollidesWith(room, x-1, y, 1, height);
					}) || x == 0) {
						expansions = expansions.filter(function (e) {return e != rndDir});
					} else {
						x--;
						width++;
						expansionCount++;
					}
					break;
				case Dir.RIGHT:
					if (nearbyRooms.some(function (room) {
						return roomCollidesWith(room, x+width, y, 1, height);
					}) || x + width == worldWidth) {
						expansions = expansions.filter(function (i) {i != rndDir});
					} else {
						width++;
						expansionCount++;
					}
					break;
				default:
					console.log("Weird expansion dir " + rndDir);
			}
		}

		var newRoom = new Room(x, y, width, height, zone);
		//addDoorsBetween(startRoom, newRoom, direction);

		//Find rooms to add doorways to
		nearbyRooms.filter(function (room) {
			return roomCollidesWith(room, x - 1, y+2, 1, height-4);
		}).forEach(function (room) {
			addDoorsBetween(newRoom, room, Dir.LEFT);
		});

		nearbyRooms.filter(function (room) {
			return roomCollidesWith(room, x + width, y+2, 1, height-4);
		}).forEach(function (room) {
			addDoorsBetween(newRoom, room, Dir.RIGHT);
		});

		nearbyRooms.filter(function (room) {
			return roomCollidesWith(room, x+2, y-1, width-4, 1);
		}).forEach(function (room) {
			addDoorsBetween(newRoom, room, Dir.UP);
		});

		nearbyRooms.filter(function (room) {
			return roomCollidesWith(room, x+2, y+height, width-4, 1);
		}).forEach(function (room) {
			addDoorsBetween(newRoom, room, Dir.DOWN);
		});

		openRooms.push(newRoom);
		addFilledCells(filledCells, newRoom);

		//set up enemies in room
		var area = width * height;
		var enemyCount = 0;
		var allowBigEnemies = (width >= 6 && height >= 6);
		if (width <= 3 || height <= 3) {
			enemyCount = 0;
		} else if (area <= 6*6) {
			enemyCount = 1;
		} else if (area <= 7*8) {
			enemyCount = 2;
		} else if (area < 9*9) {
			enemyCount = 3;
		} else if (area < 10*10) {
			enemyCount = 4;
		} else {
			enemyCount = 5;
		}
		for (var i = 0; i < enemyCount; i++) {
			var type = null;
			while (type == null) {
				var type = Math.floor(Math.random() * 5); //number of enemy types
				if (!allowBigEnemies && (type == 2 || type == 4)) type = null; //hack to remove big enemies from small rooms
			};
			newRoom.enemies.push(new Enemy(newRoom.getRandomPointInside(), newRoom, type));
		}
	}

	var addFilledCells = function(filledCells, room) {
		for (var x = room.pos.x; x < room.size.x+room.pos.x; x++) {
			for (var y = room.pos.y; y < room.size.y+room.pos.y; y++) {
				filledCells[makeKey(x, y)] = room;
			}
		}
	}

	var makeKey = function (x, y) {
		return x + y * gameConsts.worldWidth;
	}

	var findExistingRoomsInArea = function(filledCells, areaX, areaY, width, height) {
		var existingRooms = [];
		var hashSet = []; //an efficient way to avoid adding duplicates to this list.
		for (var x = areaX; x < areaX + width; x++) {
			for (var y = areaY; y < areaY + height; y++) {
				var key = makeKey(x, y);
				var value = filledCells[key];
				if (value && !hashSet[value.id]) {
					existingRooms.push(value);
					hashSet[value.id] = true;
				}
			}
		}
		return existingRooms;
	}

	this.generate = function () {
		console.log("Generating level...");
		var startTime = Date.now();
		var worldWidth = gameConsts.worldWidth;
		var worldHeight = gameConsts.worldHeight;
		var openRooms = [];
		var closedRooms = [];
		var filledCells = {};
		var firstRoom = new Room(Math.floor(worldWidth / 2)-5, Math.floor(worldHeight / 2)-5, 11, 11, "center");
		openRooms.push(firstRoom);
		addFilledCells(filledCells, firstRoom);

		while (openRooms.length > 0) {

			if (closedRooms.length > 5000) {
				console.log("Too many rooms!");
				return closedRooms; //abort
			}

			var room = (Math.random() > 0.5) ? openRooms.shift() : openRooms.pop();
			closedRooms.push(room);
			addRoom(room, Dir.UP, openRooms, filledCells, worldWidth, worldHeight);
			addRoom(room, Dir.LEFT, openRooms, filledCells, worldWidth, worldHeight);
			addRoom(room, Dir.DOWN, openRooms, filledCells, worldWidth, worldHeight);
			addRoom(room, Dir.RIGHT, openRooms, filledCells, worldWidth, worldHeight);
		}
		console.log("Generated " + closedRooms.length + " rooms in " + (Date.now() - startTime) + " ms");
		return {rooms:closedRooms, cells: filledCells};
	}
}