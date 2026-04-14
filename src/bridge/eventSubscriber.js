const { UPSTREAM_SUBJECTS } = require("./subjectCatalog");
const {
  translateEventMessage,
  translateTelemetryMessage,
} = require("./eventTranslator");

function createEventSubscriber(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("options must be an object");
  }

  if (!options.transport || typeof options.transport.subscribe !== "function") {
    throw new TypeError("transport.subscribe must be a function");
  }

  if (typeof options.onEnvelope !== "function") {
    throw new TypeError("onEnvelope must be a function");
  }

  const eventTranslator = options.eventTranslator || translateEventMessage;
  const telemetryTranslator =
    options.telemetryTranslator || translateTelemetryMessage;

  async function handleEvent(message) {
    return options.onEnvelope(eventTranslator(message.payload));
  }

  async function handleTelemetry(message) {
    return options.onEnvelope(telemetryTranslator(message));
  }

  async function start() {
    return [
      await options.transport.subscribe(UPSTREAM_SUBJECTS.EVENTS_ALL, handleEvent),
      await options.transport.subscribe(
        UPSTREAM_SUBJECTS.TELEMETRY_ENTITY,
        handleTelemetry
      ),
    ];
  }

  return {
    start,
    handleEvent,
    handleTelemetry,
  };
}

module.exports = {
  createEventSubscriber,
};
