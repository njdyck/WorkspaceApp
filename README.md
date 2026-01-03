# WorkspaceAPP – Canvas-basierter Workspace (Tauri + React)

Ein **visueller Workspace auf einem unendlichen Canvas**: Items frei platzieren, auswählen, verschieben und verbinden – mit **Pan & Zoom**, **Auto‑Save** und einer vorbereiteten **Realtime-Collaboration-Schnittstelle** (Mock + WebSocket Provider).

> Status: **Work in Progress** – Fokus liegt aktuell auf UI/UX und einer stabilen Canvas-Interaktion.

---

## Features

- **Infinite Canvas**: frei navigierbarer Arbeitsbereich mit **Pan & Zoom**
- **Items auf dem Canvas**: platzieren, auswählen (inkl. Selection-Rect), verschieben, resize
- **Verbindungen**: Items miteinander verbinden (Connection-Mode)
- **Persistenz**: Boards werden lokal gespeichert (LocalStorage) inkl. Board-Metadaten
- **Import/Export**: Board als JSON exportieren / importieren
- **Realtime (vorbereitet)**:
  - **LocalMockProvider** für Entwicklung/Testing
  - **WebSocketProvider** als Hookpoint für ein echtes Backend (Server nicht Teil dieses Repos)

---

## Tech Stack

- **Tauri v2** (Desktop Shell)
- **React 19 + TypeScript**
- **Vite**
- **Tailwind CSS**
- **Zustand** (State Management)

---

## Projektstruktur (Kurzüberblick)

- `workspace-ui/`: Frontend + Tauri App
  - `src/components/canvas/`: Canvas Rendering (Grid, Items, Connections, Viewport, Selection)
  - `src/stores/`: Zustand Stores (Canvas-State, UI-State)
  - `src/services/`:
    - `persistence.ts`: LocalStorage-Boards (Save/Load/List/Import/Export)
    - `realtime.ts`: Provider Interface + LocalMock/WebSocket Provider
  - `src-tauri/`: Rust/Tauri Host (Config + Entry Points)
- `prompts/`: UI/UX-Prompts (Design-/Komponenten-Anforderungen)

---

## Setup & Entwicklung

### Voraussetzungen

- **Node.js** (empfohlen: aktuelle LTS)
- Für Desktop Builds zusätzlich:
  - **Rust toolchain** (stable)
  - Tauri System-Voraussetzungen (je nach OS)

### Web-Dev (ohne Desktop Shell)

```bash
cd workspace-ui
npm install
npm run dev
```

### Desktop-Dev (Tauri)

```bash
cd workspace-ui
npm install
npm run tauri dev
```

### Production Build

```bash
cd workspace-ui
npm run build
```

---

## Persistenz (Boards)

Boards werden lokal im Browser/Wrapper gespeichert:

- Storage Key: `workspace_boards`
- Aktuelles Board: `workspace_current_board`

Das ist bewusst simpel gehalten, damit später leicht auf ein File‑Backend / Cloud‑Sync umgestellt werden kann.

---

## Realtime / Collaboration (Backend optional)

Die Realtime-Schicht ist als **abstraktes Provider-Interface** gebaut (`RealtimeProvider`), damit du verschiedene Backends anschließen kannst.

- **LocalMockProvider**: simuliert Verbindung/Events lokal (ideal für UI/Flow)
- **WebSocketProvider**: erwartet `serverUrl` und sendet/empfängt Events via WebSocket  
  → Ein kompatibler Server ist **nicht** in diesem Repo enthalten.

---

## Roadmap (Ideen)

- Realtime-Backend + Conflict-Handling
- Board-Verwaltung UI (Listen, Duplizieren, Sharing)
- Bessere Import/Export-Flows (Drag&Drop, Datei-Export)
- Mehr Item-Typen (Text, Webviews, Dateien, etc.)

---

## Contributing

PRs und Issues sind willkommen. Wenn du größere Änderungen planst, eröffne vorher ein Issue mit Kurzkonzept (Ziel, Ansatz, betroffene Module).

---

## Lizenz

Noch nicht festgelegt (TBD).



