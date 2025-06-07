const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwtUtils');

function setupWebSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // En producción, limitar a tu dominio frontend
      methods: ['GET', 'POST']
    }
  });
  
  // Middleware para autenticación de sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Se requiere autenticación'));
    }
    
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return next(new Error('Token inválido o expirado'));
    }
    
    // Guardar información del usuario en el objeto socket
    socket.user = decoded;
    next();
  });
  
  // Manejar conexiones
  io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.user.username} (${socket.user.id})`);
    
    // Unirse a una sala de juego
    socket.on('joinGame', (gameId) => {
      socket.join(gameId);
      console.log(`${socket.user.username} se unió a la sala: ${gameId}`);
      
      // Notificar a los demás usuarios en la sala
      socket.to(gameId).emit('userJoined', {
        userId: socket.user.id,
        username: socket.user.username
      });
    });
    
    // Manejar jugadas
    socket.on('makePlay', (data) => {
      const { gameId, dice, column } = data;
      
      // Emitir la jugada a todos los usuarios en la sala excepto al emisor
      socket.to(gameId).emit('playMade', {
        userId: socket.user.id,
        username: socket.user.username,
        dice,
        column
      });
    });
    
    // Manejar fin de partida
    socket.on('endGame', (data) => {
      const { gameId, winnerId } = data;
      
      // Emitir el fin de partida a todos los usuarios en la sala
      io.to(gameId).emit('gameEnded', {
        winnerId
      });
    });
    
    // Manejar desconexiones
    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${socket.user.username}`);
    });
  });
  
  return io;
}

module.exports = setupWebSockets;