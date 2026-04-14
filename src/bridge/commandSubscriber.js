const { UPSTREAM_SUBJECTS } = require("./subjectCatalog");
const { translateCommandMessage } = require("./commandTranslator");

function createCommandSubscriber(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("options must be an object");
  }

  if (!options.transport || typeof options.transport.subscribe !== "function") {
    throw new TypeError("transport.subscribe must be a function");
  }

  if (
    !options.governanceTransport ||
    typeof options.governanceTransport.evaluate !== "function"
  ) {
    throw new TypeError("governanceTransport.evaluate must be a function");
  }

  const onResult = options.onResult || null;
  const commandTranslator = options.commandTranslator || translateCommandMessage;

  async function handleCommand(message) {
    const translation = commandTranslator(message);
    const outcome = await options.governanceTransport.evaluate(
      translation.request
    );
    const result = {
      request: translation.request,
      raw_payload: translation.raw_payload,
      route: translation.route,
      outcome,
    };

    if (typeof onResult === "function") {
      await onResult(result);
    }

    return result;
  }

  async function start() {
    return [
      await options.transport.subscribe(
        UPSTREAM_SUBJECTS.COMMAND_ENTITY_OR_BROADCAST,
        handleCommand
      ),
    ];
  }

  return {
    start,
    handleCommand,
  };
}

module.exports = {
  createCommandSubscriber,
};
