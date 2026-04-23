import { useEffect, useState } from "react";
import { ControlRoomShell } from "./components/ControlRoomShell.tsx";
import { loadScenario } from "./data/loadScenario";
import { scenarioRegistry } from "./data/scenarioRegistry";
import {
  createErrorScenarioRecord,
  createLoadingScenarioRecord,
  createReadyScenarioRecord,
} from "./state/controlRoomState.ts";
import type { ControlRoomScenarioRecord } from "./state/controlRoomState.ts";

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown dashboard load failure.";
}

export default function App() {
  const [records, setRecords] = useState<ControlRoomScenarioRecord[]>(
    scenarioRegistry.map((entry) => createLoadingScenarioRecord(entry))
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const nextRecords = await Promise.all(
        scenarioRegistry.map(async (entry) => {
          try {
            const loaded = await loadScenario(entry);
            return createReadyScenarioRecord(entry, loaded.payload);
          } catch (error) {
            return createErrorScenarioRecord(entry, formatError(error));
          }
        })
      );

      if (!cancelled) {
        setRecords(nextRecords);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <ControlRoomShell records={records} />
    </main>
  );
}
