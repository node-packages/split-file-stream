const assert = require("assert");
const fs = require("fs");
const stream = require("stream");
const splitFileStream = require("..");

describe("#split", () => {
	it("should create 5 partitions for a 5 word string of 1 byte partitions", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end("abcde");

		splitFileStream.split(readStream, 1, __dirname + "/output/ff", (filePaths) => {
			assert.equal(5, filePaths.length);
			return done();
		});
	});

	it("should create 2 partitions for 100mb file of 50mb chunks", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end(new Buffer(1024 * 1024 * 100));

		splitFileStream.split(readStream, 1024 * 1024 * 50, __dirname + "/output/ff", (filePaths) => {
			assert.equal(2, filePaths.length);
			return done();
		});
	});

	it("should create partitions that retain the same data", (done) => {
		let readStream = new stream.PassThrough(), inStreamContents = "CORRECT";
		readStream.end(inStreamContents);

		splitFileStream.split(readStream, 1, __dirname + "/output/ff", (filePaths) => {
			let concatString = "";
			filePaths.forEach((filePath) => {
				let fileContent = fs.readFileSync(filePath);
				concatString += fileContent;
			});

			assert.equal(concatString, inStreamContents);
			return done();
		});
	});
});
