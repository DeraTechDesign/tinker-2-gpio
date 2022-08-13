"use strict";
var fs = require("fs"),
	path = require("path"),
	exec = require("child_process").exec;

var sysFsPathOld = "/sys/devices/virtual/gpio", // pre 3.18.x kernel
	sysFsPathNew = "/sys/class/gpio", // post 3.18.x kernel
	sysFsPath;

// var rev = fs.readFileSync("/proc/cpuinfo").toString().split("\n").filter(function(line) {
// 	return line.indexOf("Revision") == 0;
// })[0].split(":")[1].trim();

// tests the device tree directory to determine the actual gpio path
if (fs.existsSync(sysFsPathNew)) {
	sysFsPath = sysFsPathNew;
} else {
	sysFsPath = sysFsPathOld; // fallback for old kernels
}

// rev = parseInt(rev, 16) < 3 ? 1 : 2; // http://elinux.org/RPi_HardwareHistory#Board_Revision_History

var pinMapping = {
	"8": 73,
	"9": 74,
	"7": 8,
	"0": 83,
	"2": 85,
	"3": 84,
	"12": 40,
	"13": 39,
	"14": 41,
	"30": 71,
	"21": 126,
	"22": 125,
	"23": 150,
	"24": 121,
	"25": 149,
	
	"15": 81,
	"16": 80,
	"1": 120,
	"4": 86,
	"5": 87,
	"6": 124,
	"10": 42,
	"11": 6,
	"31": 72,
	"26": 146,
	"27": 82,
	"28": 123,
	"29": 127
};

// if (rev == 2) {
// 	pinMapping["3"] = 2;
// 	pinMapping["5"] = 3;
// 	pinMapping["13"] = 27;
// }

function isNumber(number) {
	return !isNaN(parseInt(number, 10));
}

function noop() {}

function handleExecResponse(method, pinNumber, callback) {
	return function(err, stdout, stderr) {
		if (err) {
			console.error("Error when trying to", method, "pin", pinNumber);
			console.error(stderr);
			callback(err);
		} else {
			callback();
		}
	}
}

function sanitizePinNumber(pinNumber) {
	if (!isNumber(pinNumber) || !isNumber(pinMapping[pinNumber])) {
		throw new Error("Pin number isn't valid");
	}

	return parseInt(pinNumber, 10);
}

function sanitizeDirection(direction) {
	direction = (direction || "").toLowerCase().trim();
	if (direction === "in" || direction === "input") {
		return "in";
	} else if (direction === "out" || direction === "output" || !direction) {
		return "out";
	} else {
		throw new Error("Direction must be 'input' or 'output'");
	}
}

function sanitizeOptions(options) {
	var sanitized = {};

	options.split(" ").forEach(function(token) {
		if (token == "in" || token == "input") {
			sanitized.direction = "in";
		}

		if (token == "pullup" || token == "up") {
			sanitized.pull = "pullup";
		}

		if (token == "pulldown" || token == "down") {
			sanitized.pull = "pulldown";
		}
	});

	if (!sanitized.direction) {
		sanitized.direction = "out";
	}

	if (!sanitized.pull) {
		sanitized.pull = "";
	}

	return sanitized;
}

var gpio = {
// 	rev: rev,

	open: function(pinNumber, options, callback) {
		pinNumber = sanitizePinNumber(pinNumber);

		if (!callback && typeof options === "function") {
			callback = options;
			options = "out";
		}

		options = sanitizeOptions(options);
		
		exec("gpio export " + pinMapping[pinNumber] + " " + options.direction, handleExecResponse("open", pinNumber, callback || noop));
	},
	setDirection: function(pinNumber, direction, callback) {
		pinNumber = sanitizePinNumber(pinNumber);
		direction = sanitizeDirection(direction);

		fs.writeFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/direction", direction, (callback || noop));
	},

	getDirection: function(pinNumber, callback) {
		pinNumber = sanitizePinNumber(pinNumber);
		callback = callback || noop;

		fs.readFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/direction", "utf8", function(err, direction) {
			if (err) return callback(err);
			callback(null, sanitizeDirection(direction.trim()));
		});
	},

	close: function(pinNumber, callback) {
		pinNumber = sanitizePinNumber(pinNumber);
		
		exec("gpio unexport " + pinMapping[pinNumber], handleExecResponse("close", pinNumber, callback || noop));
	},

	read: function(pinNumber, callback) {
		pinNumber = sanitizePinNumber(pinNumber);

		fs.readFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/value", function(err, data) {
			if (err) return (callback || noop)(err);

			(callback || noop)(null, parseInt(data, 10));
		});
	},

	watch: function(pinNumber, callback) {
		pinNumber = sanitizePinNumber(pinNumber);
		fs.watchFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/value", (curr, prev) => {
			console.log("Curr: ", curr.mtime);
			console.log("Curr: ", prev.mtime);
			fs.readFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/value", function(err, data) {
				if (err) return (callback || noop)(err);
				(callback || noop)(null, parseInt(data, 10));
			});
		});
	},

	write: function(pinNumber, value, callback) {
		pinNumber = sanitizePinNumber(pinNumber);

		value = !!value ? "1" : "0";

		fs.writeFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/value", value, "utf8", callback);
	}
};

gpio.export = gpio.open;
gpio.unexport = gpio.close;

module.exports = gpio;
