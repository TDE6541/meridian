const fs = require("node:fs");
const path = require("node:path");
const { CivicForensicChain } = require("./civicForensicChain");

const DEFAULT_CHAIN_DIRECTORY = ".meridian/forensic-chain";
const DEFAULT_CHAIN_FILE_NAME = "demo-forensic-chain.json";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value, fallback) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function fileExists(fsImplementation, filePath) {
  if (typeof fsImplementation.existsSync === "function") {
    return fsImplementation.existsSync(filePath);
  }

  try {
    fsImplementation.accessSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

class ChainPersistence {
  constructor(options = {}) {
    if (!isPlainObject(options)) {
      throw new TypeError("options must be a plain object");
    }

    this.fs = options.fs || fs;
    this.path = options.path || path;
    this.cwd = normalizeString(options.cwd, process.cwd());
    this.chainDirectory = normalizeString(
      options.chainDirectory || options.chain_directory,
      DEFAULT_CHAIN_DIRECTORY
    );
    this.chainFileName = normalizeString(
      options.chainFileName || options.chain_file_name,
      DEFAULT_CHAIN_FILE_NAME
    );
    this.baseEntryTypes =
      options.baseEntryTypes || options.base_entry_types || [];

    if (typeof this.fs.readFileSync !== "function") {
      throw new TypeError("fs.readFileSync must be a function");
    }

    if (typeof this.fs.writeFileSync !== "function") {
      throw new TypeError("fs.writeFileSync must be a function");
    }

    if (typeof this.fs.mkdirSync !== "function") {
      throw new TypeError("fs.mkdirSync must be a function");
    }

    if (
      typeof this.path.resolve !== "function" ||
      typeof this.path.dirname !== "function"
    ) {
      throw new TypeError("path resolve and dirname functions are required");
    }
  }

  resolveFilePath() {
    return this.path.resolve(this.cwd, this.chainDirectory, this.chainFileName);
  }

  loadChain() {
    const filePath = this.resolveFilePath();
    if (!fileExists(this.fs, filePath)) {
      return new CivicForensicChain({
        baseEntryTypes: this.baseEntryTypes,
      });
    }

    const rawSnapshot = this.fs.readFileSync(filePath, "utf8");
    const snapshot = JSON.parse(rawSnapshot);

    return CivicForensicChain.fromSnapshot(snapshot);
  }

  saveChain(chain) {
    if (
      !chain ||
      typeof chain.getSnapshot !== "function" ||
      typeof chain.getEntries !== "function"
    ) {
      throw new TypeError("chain must expose getSnapshot() and getEntries()");
    }

    const filePath = this.resolveFilePath();
    const chainDirectoryPath = this.path.dirname(filePath);

    this.fs.mkdirSync(chainDirectoryPath, {
      recursive: true,
    });
    this.fs.writeFileSync(
      filePath,
      `${JSON.stringify(chain.getSnapshot(), null, 2)}\n`,
      "utf8"
    );

    return filePath;
  }
}

module.exports = {
  ChainPersistence,
  DEFAULT_CHAIN_DIRECTORY,
  DEFAULT_CHAIN_FILE_NAME,
};
