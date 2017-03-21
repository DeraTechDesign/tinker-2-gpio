var gpio = require("../pi-gpio"),
	should = require("should"),
	fs = require("fs");

var sysFsPathOld = "/sys/devices/virtual/gpio", // pre 3.18.x kernel
	sysFsPathNew = "/sys/class/gpio", // post 3.18.x kernel
	sysFsPath;

if (fs.existsSync(sysFsPathNew)) {
	sysFsPath = sysFsPathNew;
} else {
	sysFsPath = sysFsPathOld; // fallback for old kernels
}

var pinMapping = {
	"3": 252,
	"5": 253,
	"7": 17,
	"8": 161,
	"10": 160,
	"11": 164,
	"12": 184,
	"13": 166,
	"15": 167,
	"16": 162,
	"18": 163,
	"19": 257,
	"21": 256,
	"22": 171,
	"23": 254,
	"24": 255,
	
	// Model A+ and Model B+ pins
	"26": 251,
	"29": 165,
	"31": 168,
	"32": 239,
	"33": 238,
	"35": 185,
	"36": 223,
	"37": 224,
	"38": 187,
	"40": 188
};

describe("pi-gpio", function() {
	describe(".open", function() {
		it("should open without errors", function(done) {
			gpio.open(16, "output", function(err) {
				should.not.exist(err);
				done();
			});
		});

		it("should throw an error if the pin is invalid", function() {
			try {
				gpio.open(1);
			} catch(e) {
				e.should.exist;
			}
		});

		it("should set the direction correctly", function(done) {
			fs.readFile(sysFsPath + "/gpio" + pinMapping[16] + "/direction", "utf8", function(err, data) {
				should.not.exist(err);
				data.trim().should.equal("out");
				done();
			});
		});
	});

	describe(".close", function() {
		it("should close an open pin", function(done) {
			gpio.close(16, done);
		});
	});

	describe(".setDirection", function() {
		it("should set the direction of the pin", function(done) {
			gpio.open(16, function(err) {
				should.not.exist(err);

				gpio.setDirection(16, "input", function(err) {
					should.not.exist(err);

					fs.readFile(sysFsPath + "/gpio" + pinMapping[16] + "/direction", "utf8", function(err, data) {
						should.not.exist(err);
						data.trim().should.equal("in");
						done();
					});
				});
			});
		});
	});

	describe(".getDirection", function() {
		it("should get the direction of the pin", function(done) {
			gpio.getDirection(16, function(err, direction) {
				should.not.exist(err);

				direction.should.equal("in");
				done();
			});
		});
	});

	describe(".write", function() {
		it("should write the value of the pin", function(done) {
			gpio.setDirection(16, "output", function(err) {
				should.not.exist(err);

				gpio.write(16, "1", function(err) {
					should.not.exist(err);

					fs.readFile(sysFsPath + "/gpio" + pinMapping[16] + "/value", "utf8", function(err, data) {
						should.not.exist(err);
						data.trim().should.equal("1");
						done();
					});
				});
			});
		});
	});

	describe(".read", function() {
		it("should read the value at the pin correctly", function(done) {
			gpio.read(16, function(err, value) {
				should.not.exist(err);

				value.should.equal(1);
				done();
			});
		});
	});

	after(function(done) {
		gpio.close(16, done);
	});
});
