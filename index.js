const fs = require("fs");

const generateFileName = (rootFileName, numFiles) => `${rootFileName}.split-${numFiles}`;

module.exports.split = (fileStream, maxFileSize, rootFileName, callback) => {
	const partitionNames = [], { highWaterMark: defaultChunkSize } = fileStream._readableState;
	let currentFileSize = 0, currentFileName, openStream = false, finishedWriteStreams = 0, fileStreamEnded = false;

	let currentFileWriteStream;

	const closeCurrentWriteStream = () => {
		currentFileWriteStream.end();
		currentFileWriteStream = null;
		currentFileSize = 0;
		openStream = false;
	};

	const callbackAttempt = () => {
		if(fileStreamEnded && partitionNames.length == finishedWriteStreams) {
			callback(partitionNames);
		}
	};

	fileStream.on("readable", () => {
		let chunk;
		while (null !== (chunk = fileStream.read(Math.min(maxFileSize - currentFileSize, defaultChunkSize)))) {
			if(openStream == false) {
				currentFileName = generateFileName(rootFileName, partitionNames.length);
				currentFileWriteStream = fs.createWriteStream(currentFileName);
				currentFileWriteStream.on("finish", () => {
					finishedWriteStreams++;
					callbackAttempt();
				});
				partitionNames.push(currentFileName);
				openStream = true;
			}

			currentFileWriteStream.write(chunk);
			currentFileSize += chunk.length;

			if(currentFileSize == maxFileSize) {
				closeCurrentWriteStream();
			}
		}
	});

	fileStream.on("end", () => {
		if(currentFileWriteStream) {
			closeCurrentWriteStream();
		}
		fileStreamEnded = true;
		callbackAttempt();
	});
};

const _mergeFilesToDisk = (partition_index, partition_names, writeOutStream, callback) => {
	if(partition_index == partition_names.length) {
		writeOutStream.close();
		return callback();
	}
	let partitionFileStream = fs.createReadStream(partition_names[partition_index]);

	partitionFileStream.on("data", (chunk) => writeOutStream.write(chunk));
	partitionFileStream.on("end", () => _mergeFilesToDisk(++partition_index, partition_names, writeOutStream, callback));
};

module.exports.mergeFilesToDisk = (partition_names, outputPath, callback) => {
	let outputWriteStream = fs.createWriteStream(outputPath);
	_mergeFilesToDisk(0, partition_names, outputWriteStream, callback);
};