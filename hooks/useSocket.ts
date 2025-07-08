import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  token: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useSocket = (options: UseSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Clean up existing connection
    if (socketRef.current) {
      console.log('Cleaning up existing socket connection');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }

    // Don't connect if no token
    if (!options.token) {
      console.log('No token available, skipping socket connection');
      return;
    }

    console.log('Initializing socket connection with token:', options.token.substring(0, 10) + '...');

    // Initialize socket connection with proper auth
    const socket = io('https://whatsapp.recuperafly.com', {
      auth: {
        token: options.token
      },
      extraHeaders: {
        'Authorization': `Bearer ${options.token}`
      },
      query: {
        token: options.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
    });

    socketRef.current = socket;

    // Socket event listeners
    socket.on('connect', () => {
      console.log('Socket connected successfully:', socket.id);
      setIsConnected(true);
      options.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      options.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      options.onError?.(error);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      options.onError?.(error);
    });

    // Handle authentication errors specifically
    socket.on('unauthorized', (error) => {
      console.error('Socket unauthorized:', error);
      setIsConnected(false);
      options.onError?.(new Error('Authentication failed: ' + error.message));
    });

    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.disconnect();
        setIsConnected(false);
      }
    };
  }, [options.token]); // Only depend on token

  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      console.log('Emitting event:', event, data);
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected
  };
};