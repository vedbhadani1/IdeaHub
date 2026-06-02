import { socket } from './socket';
import { bindSocketEvents, unbindSocketEvents } from './socket-events';

class SocketManagerClass {
  private isConnected = false;

  public connect(token: string) {
    if (this.isConnected) return;
    
    // Set authentication token
    socket.auth = { token };
    
    // Bind all application-level events before connecting
    bindSocketEvents();
    
    socket.connect();
    
    socket.on('connect', () => {
      console.log('Socket connected gracefully');
      this.isConnected = true;
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected, gracefully degrading');
      this.isConnected = false;
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }

  public disconnect() {
    if (!this.isConnected) return;
    unbindSocketEvents();
    socket.disconnect();
    this.isConnected = false;
  }
}

export const SocketManager = new SocketManagerClass();
