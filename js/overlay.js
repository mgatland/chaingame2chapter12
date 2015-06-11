var HudOverlay = function(overlayId, gameWindow, gameConsts) {
	var canvas2 = document.getElementById(overlayId);
	var ctx2 = canvas2.getContext("2d");
	var roomMargin = gameConsts.wallWidth + 4;
	var lineHeight = 20;
	var minimumWidthForText = 88;

	this.clear = function () {
		ctx2.clearRect(0, 0, gameWindow.width, gameWindow.height);
	}

	this.setContextForMessages = function () {
		ctx2.font = '18px "Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace';
		ctx2.textAlign = "left";
		ctx2.textBaseline = "top";
	}

	var fakeCamera = {pos: {x:0, y:0}};

	this.getMessageDrawingArea = function (room, camera) {
		var pX = (room.pos.x * gameConsts.tileSize - camera.pos.x);
		var pY =  (room.pos.y * gameConsts.tileSize - camera.pos.y);
		var pWidth = room.size.x * gameConsts.tileSize;
		var pHeight = room.size.y * gameConsts.tileSize;
		pX += roomMargin;
		pY += roomMargin;
		pWidth -= roomMargin * 2;
		pHeight -= roomMargin * 2;
		return {x:pX, y:pY, width:pWidth, height:pHeight};
	}

	this.drawMessages = function (room, camera, messageWaiting) {
		resize();
		ctx2.fillStyle = "#5DE100";
		if (!room.messages && !messageWaiting) return;
		this.setContextForMessages();
		var area = this.getMessageDrawingArea(room, camera);
		var lines = this.getMessageLines(room.messages, area);
		lines.forEach(function (line, i) {
			ctx2.fillText(line, area.x, area.y+i*lineHeight);
		});
		if (messageWaiting) {
			ctx2.fillText("↓↓↓↓↓", area.x, area.y+lines.length*lineHeight);
		}
	}

	this.getMessageLines = function (messages, area) {
		if (!messages) return [];
		var that = this;
		var lines = [];
		messages.forEach(function (msg) {
			lines = lines.concat(that.getMessageLinesForMessage(msg, area));
		});
		return lines;
	}

	this.getMessageLinesForMessage = function (msg, area, row) {
		//Split the text into lines that are shorter than pWidth
		var words = msg.split(" ");
		var i = 0; //current line
		var lines = [];
		var first = true;
		while (words.length > 0) {
			if (!lines[i]) {
				lines[i] = i > 0 ? " " + words.shift() : words.shift();
			} else {
				var testLine = lines[i] + " " + words[0];
				if (ctx2.measureText(testLine).width > area.width) {
					i++; //start a new line
				} else {
					lines[i] = testLine;
					words.shift();
				}
			}
		}
		return lines;
	}

	var resize = function () {
		if (canvas2.width != gameWindow.width) canvas2.width = gameWindow.width;
		if (canvas2.height != gameWindow.height) canvas2.height = gameWindow.height;
	}

	this.drawHud = function(itemHint, message, bitscore, roomsExplored, roomsInTotal, fps) {
		ctx2.fillStyle = "#5DE100";
		ctx2.font = '32px "Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace';
		ctx2.fillText("FPS: " + fps, 850, gameWindow.height - 32);
		
		if (message) {
			var width = ctx2.measureText(message).width;
			var x = gameWindow.width / 2 - width / 2;
			var y = gameWindow.height /4 * 3;
			ctx2.fillStyle = "rgba(0, 0, 0, 0.7)";
			ctx2.fillRect(x, y-32, width, 40);
			ctx2.fillStyle = "#5DE100";
			ctx2.fillText(message, x, y);

		}
		
		if (itemHint) {
			ctx2.font = '22px "Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace';
			var width = ctx2.measureText(itemHint).width;
			var x = gameWindow.width / 2 - width / 2;
			var y = gameWindow.height / 2 + 64;
			ctx2.fillStyle = "rgba(0, 0, 0, 0.7)";
			ctx2.fillRect(x, y-22, width, 28);
			ctx2.fillStyle = "#5DE100";
			ctx2.fillText(itemHint, x, y);
		}
		
	}
}
