// Every slice's event handlers, registered by importing their modules (src/server/events.ts).
// Anything that emits imports this file first, or a handler silently does not run.
// One line per slice.
import './invoice-handlers';
