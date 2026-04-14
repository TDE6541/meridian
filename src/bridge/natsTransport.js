const { JSONCodec, connect } = require("nats");
const { CONNECTION_CONFIG } = require("./subjectCatalog");

function createNatsTransport(options = {}) {
  const connectFn = options.connectFn || connect;
  const codec = options.codec || JSONCodec();
  const servers = options.servers || CONNECTION_CONFIG.servers;
  const onError = options.onError || null;
  let connection = options.connection || null;
  let lastError = null;
  const listeners = new Set();

  async function ensureConnection() {
    if (connection !== null) {
      return connection;
    }

    connection = await connectFn({ servers });
    return connection;
  }

  async function subscribe(subject, handler) {
    if (typeof handler !== "function") {
      throw new TypeError("handler must be a function");
    }

    const activeConnection = await ensureConnection();
    const subscription = activeConnection.subscribe(subject);
    const listener = (async () => {
      try {
        for await (const message of subscription) {
          await handler({
            subject: message.subject,
            payload: codec.decode(message.data),
            message,
          });
        }
      } catch (error) {
        lastError = error;

        if (typeof onError === "function") {
          await onError(error);
        }
      }
    })();

    listeners.add(listener);
    listener.finally(() => listeners.delete(listener));
    return subscription;
  }

  async function publish(subject, payload) {
    const activeConnection = await ensureConnection();

    activeConnection.publish(subject, codec.encode(payload));

    return {
      subject,
      payload,
    };
  }

  async function drain() {
    if (connection !== null && typeof connection.drain === "function") {
      await connection.drain();
    }
  }

  async function close() {
    await Promise.allSettled([...listeners]);

    if (connection !== null && typeof connection.close === "function") {
      await connection.close();
    }
  }

  return {
    ensureConnection,
    subscribe,
    publish,
    drain,
    close,
    getLastError: () => lastError,
  };
}

module.exports = {
  createNatsTransport,
};
