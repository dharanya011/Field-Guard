import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export interface SyncWSMessage {
  type: 'SYNC_EVENT' | 'INSPECTION_UPDATED' | 'CONFLICT_DETECTED' | 'PONG' | 'CONNECTED';
  payload?: Record<string, unknown>;
  timestamp: string;
}

class WebSocketSyncManager {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  public init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/sync' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WA-1 WS SYNC] Client connected. Total active clients: ${this.clients.size}`);

      // Send welcome handshake
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: { message: 'WA-1 Realtime Bidirectional Sync Channel Active', activeClients: this.clients.size },
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch {
          // Ignore invalid frames
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WA-1 WS SYNC] Client disconnected. Total active clients: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.warn('[WA-1 WS SYNC] Socket warning:', err.message);
        this.clients.delete(ws);
      });
    });
  }

  public broadcast(message: SyncWSMessage) {
    const payloadStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payloadStr);
      }
    });
  }
}

export const wsSyncManager = new WebSocketSyncManager();
