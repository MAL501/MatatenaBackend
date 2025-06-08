const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwtUtils');
const { executeQuery } = require('../config/db');

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
    socket.on('joinGame', async (gameId) => {
      try {
        // Verificar que el usuario es parte de la partida
        const games = await executeQuery(
          'SELECT g.*, host.username AS host_username, guest.username AS guest_username FROM game g LEFT JOIN users host ON g.host_user = host.id LEFT JOIN users guest ON g.guest_user = guest.id WHERE g.id = ? AND (g.host_user = ? OR g.guest_user = ?)',
          [gameId, socket.user.id, socket.user.id]
        );
        
        if (games.length === 0) {
          socket.emit('error', { message: 'No tienes acceso a esta partida' });
          return;
        }
        
        const game = games[0];
        socket.join(gameId.toString());
        console.log(`${socket.user.username} se unió a la sala: ${gameId}`);
        
        // Determinar el oponente
        let opponentName = null;
        if (game.host_user == socket.user.id && game.guest_username) {
          opponentName = game.guest_username;
        } else if (game.guest_user == socket.user.id && game.host_username) {
          opponentName = game.host_username;
        }
        
        // Enviar información de la partida al usuario que se conecta
        socket.emit('gameJoined', {
          gameId,
          gameCode: game.code,
          isHost: game.host_user == socket.user.id,
          opponentName,
          gameStarted: !!game.guest_user,
          gameEnded: !!game.ended_at,
          winner: game.winner
        });
        
        // Si la partida acaba de empezar (se unió el segundo jugador)
        if (game.guest_user && !game.ended_at) {
          socket.to(gameId.toString()).emit('gameStarted', {
            opponentName: socket.user.username,
            message: `${socket.user.username} se ha unido a la partida. ¡El juego puede comenzar!`
          });
        }
        
      } catch (error) {
        console.error('Error al unirse a la partida:', error);
        socket.emit('error', { message: 'Error al unirse a la partida' });
      }
    });
    
    // Manejar jugadas
    socket.on('makePlay', async (data) => {
      try {
        const { gameId, dice, column } = data;
        
        // Verificar que la partida existe y el usuario puede jugar
        const games = await executeQuery(
          'SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?) AND ended_at IS NULL',
          [gameId, socket.user.id, socket.user.id]
        );
        
        if (games.length === 0) {
          socket.emit('error', { message: 'No puedes hacer jugadas en esta partida' });
          return;
        }
        
        // Registrar la jugada en la base de datos
        await executeQuery(
          'INSERT INTO plays (match_id, move, dice, col, created_at) VALUES (?, ?, ?, ?, NOW())',
          [gameId, socket.user.id, dice, column]
        );
        
        // Emitir la jugada a todos los usuarios en la sala
        io.to(gameId.toString()).emit('playMade', {
          userId: socket.user.id,
          username: socket.user.username,
          dice,
          column,
          timestamp: new Date().toISOString()
        });
        
        console.log(`${socket.user.username} hizo una jugada: dado ${dice}, columna ${column}`);
        
      } catch (error) {
        console.error('Error al procesar jugada:', error);
        socket.emit('error', { message: 'Error al procesar la jugada' });
      }
    });
    
    // Manejar fin de partida
    socket.on('endGame', async (data) => {
      try {
        const { gameId, winnerId } = data;
        
        // Verificar que el usuario puede finalizar la partida
        const games = await executeQuery(
          'SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?) AND ended_at IS NULL',
          [gameId, socket.user.id, socket.user.id]
        );
        
        if (games.length === 0) {
          socket.emit('error', { message: 'No puedes finalizar esta partida' });
          return;
        }
        
        const game = games[0];
        
        // Verificar que el ganador es válido
        if (winnerId !== game.host_user && winnerId !== game.guest_user) {
          socket.emit('error', { message: 'Ganador inválido' });
          return;
        }
        
        // Actualizar la partida en la base de datos
        await executeQuery(
          'UPDATE game SET winner = ?, ended_at = NOW() WHERE id = ?',
          [winnerId, gameId]
        );
        
        // Obtener información del ganador
        const winner = await executeQuery('SELECT username FROM users WHERE id = ?', [winnerId]);
        
        // Emitir el fin de partida a todos los usuarios en la sala
        io.to(gameId.toString()).emit('gameEnded', {
          winnerId,
          winnerUsername: winner[0].username,
          message: `¡${winner[0].username} ha ganado la partida!`
        });
        
        console.log(`Partida ${gameId} finalizada. Ganador: ${winner[0].username}`);
        
      } catch (error) {
        console.error('Error al finalizar partida:', error);
        socket.emit('error', { message: 'Error al finalizar la partida' });
      }
    });
    
    // Manejar desconexiones
    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${socket.user.username}`);
    });
  });
  
  return io;
}

module.exports = setupWebSockets;