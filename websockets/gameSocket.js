const { Server } = require("socket.io")
const { verifyAccessToken } = require("../utils/jwtUtils")
const { executeQuery } = require("../config/db")

function setupWebSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // En producción, limitar a tu dominio frontend
      methods: ["GET", "POST"],
    },
  })

  // Middleware para autenticación de sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error("Se requiere autenticación"))
    }

    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return next(new Error("Token inválido o expirado"))
    }

    // Guardar información del usuario en el objeto socket
    socket.user = decoded
    next()
  })

  // Manejar conexiones
  io.on("connection", (socket) => {
    console.log(`Usuario conectado: ${socket.user.username} (${socket.user.id})`)

    // Unirse a una sala de juego
    socket.on("joinGame", async (gameId) => {
      try {
        // Verificar que el usuario es parte de la partida
        const games = await executeQuery(
          "SELECT g.*, host.username AS host_username, guest.username AS guest_username FROM game g LEFT JOIN users host ON g.host_user = host.id LEFT JOIN users guest ON g.guest_user = guest.id WHERE g.id = ? AND (g.host_user = ? OR g.guest_user = ?)",
          [gameId, socket.user.id, socket.user.id],
        )

        if (games.length === 0) {
          socket.emit("error", { message: "No tienes acceso a esta partida" })
          return
        }

        const game = games[0]
        socket.join(gameId.toString())
        console.log(`${socket.user.username} se unió a la sala: ${gameId}`)

        // Determinar el oponente
        let opponentName = null
        if (game.host_user == socket.user.id && game.guest_username) {
          opponentName = game.guest_username
        } else if (game.guest_user == socket.user.id && game.host_username) {
          opponentName = game.host_username
        }

        // Enviar información de la partida al usuario que se conecta
        socket.emit("gameJoined", {
          gameId,
          gameCode: game.code,
          isHost: game.host_user == socket.user.id,
          opponentName,
          gameStarted: !!game.guest_user,
          gameEnded: !!game.ended_at,
          winner: game.winner,
        })

        // Enviar el estado completo del juego
        socket.emit("getGameState", gameId)

        // Si la partida acaba de empezar (se unió el segundo jugador)
        if (game.guest_user && !game.ended_at) {
          socket.to(gameId.toString()).emit("gameStarted", {
            opponentName: socket.user.username,
            message: `${socket.user.username} se ha unido a la partida. ¡El juego puede comenzar!`,
          })
        }
      } catch (error) {
        console.error("Error al unirse a la partida:", error)
        socket.emit("error", { message: "Error al unirse a la partida" })
      }
    })

    // Manejar jugadas - SIN VALIDACIONES DE LÓGICA DE JUEGO
    socket.on("makePlay", async (data) => {
      try {
        const { gameId, dice, column } = data

        // Solo verificar que la partida existe y el usuario es parte de ella
        const games = await executeQuery("SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)", [
          gameId,
          socket.user.id,
          socket.user.id,
        ])

        if (games.length === 0) {
          socket.emit("error", { message: "No puedes hacer jugadas en esta partida" })
          return
        }

        // Convertir el ID de columna del frontend al formato de la base de datos
        let dbColumn
        if (["1", "2", "3"].includes(column)) {
          // Columnas del jugador 1 (host)
          dbColumn = Number.parseInt(column) - 1 // 0, 1, 2
        } else if (["4", "5", "6"].includes(column)) {
          // Columnas del jugador 2 (guest)
          dbColumn = Number.parseInt(column) - 4 // 0, 1, 2
        } else {
          socket.emit("error", { message: "ID de columna inválido" })
          return
        }

        // Registrar la jugada en la base de datos SIN VALIDACIONES
        await executeQuery("INSERT INTO plays (match_id, move, dice, col, created_at) VALUES (?, ?, ?, ?, NOW())", [
          gameId,
          socket.user.id,
          dice,
          dbColumn,
        ])

        // LOGS ADICIONALES PARA DEBUG
        console.log("🔍 DEBUG - Datos que se van a emitir:")
        console.log("🔍 gameId:", gameId)
        console.log("🔍 userId:", socket.user.id)
        console.log("🔍 username:", socket.user.username)
        console.log("🔍 dice:", dice)
        console.log("🔍 column (frontend ID):", column)
        console.log("🔍 Usuarios en la sala:", io.sockets.adapter.rooms.get(gameId.toString()))

        // Emitir la jugada a todos los usuarios en la sala con el ID de columna del frontend
        io.to(gameId.toString()).emit("playMade", {
          userId: socket.user.id,
          username: socket.user.username,
          dice,
          column, // Mantener el ID de columna del frontend
          gameId,
          timestamp: new Date().toISOString(),
        })

        console.log("✅ Evento playMade emitido a la sala:", gameId)
        console.log(`${socket.user.username} hizo una jugada: dado ${dice}, columna ${column}`)
      } catch (error) {
        console.error("Error al procesar jugada:", error)
        socket.emit("error", { message: "Error al procesar la jugada" })
      }
    })

    // Obtener estado completo del juego
    socket.on("getGameState", async (gameId) => {
      try {
        // Verificar que el usuario tiene acceso a la partida
        const games = await executeQuery(
          "SELECT g.*, host.username AS host_username, guest.username AS guest_username FROM game g LEFT JOIN users host ON g.host_user = host.id LEFT JOIN users guest ON g.guest_user = guest.id WHERE g.id = ? AND (g.host_user = ? OR g.guest_user = ?)",
          [gameId, socket.user.id, socket.user.id],
        )

        if (games.length === 0) {
          socket.emit("error", { message: "No tienes acceso a esta partida" })
          return
        }

        const game = games[0]

        // Obtener todas las jugadas de la partida
        const plays = await executeQuery(
          `
          SELECT p.*, u.username
          FROM plays p
          JOIN users u ON p.move = u.id
          WHERE p.match_id = ?
          ORDER BY p.id ASC
        `,
          [gameId],
        )

        // Organizar las jugadas por jugador y columna
        const gameState = {
          gameId,
          gameCode: game.code,
          hostUser: game.host_user,
          guestUser: game.guest_user,
          hostUsername: game.host_username,
          guestUsername: game.guest_username,
          winner: game.winner,
          startedAt: game.started_at,
          endedAt: game.ended_at,
          columns: {
            // Columnas del host (jugador 1)
            1: [], // columna 0 del host
            2: [], // columna 1 del host
            3: [], // columna 2 del host
            // Columnas del guest (jugador 2)
            4: [], // columna 0 del guest
            5: [], // columna 1 del guest
            6: [], // columna 2 del guest
          },
          plays: plays,
        }

        // Llenar las columnas con los dados jugados
        plays.forEach((play) => {
          const isHostPlay = play.move === game.host_user
          let columnId

          if (isHostPlay) {
            // Jugada del host - columnas 1, 2, 3
            columnId = (play.col + 1).toString()
          } else {
            // Jugada del guest - columnas 4, 5, 6
            columnId = (play.col + 4).toString()
          }

          if (gameState.columns[columnId]) {
            gameState.columns[columnId].push(play.dice)
          }
        })

        // Determinar de quién es el turno basado en la última jugada
        if (plays.length === 0) {
          gameState.currentTurn = game.host_user // El host siempre empieza
        } else {
          const lastPlay = plays[plays.length - 1]
          // El turno es del jugador que NO hizo la última jugada
          gameState.currentTurn = lastPlay.move === game.host_user ? game.guest_user : game.host_user
        }

        socket.emit("gameState", gameState)
      } catch (error) {
        console.error("Error al obtener estado del juego:", error)
        socket.emit("error", { message: "Error al obtener el estado del juego" })
      }
    })

    // Manejar fin de partida - SIN VALIDACIONES COMPLEJAS
    socket.on("endGame", async (data) => {
      try {
        const { gameId, winnerId } = data

        // Solo verificar que el usuario es parte de la partida
        const games = await executeQuery("SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)", [
          gameId,
          socket.user.id,
          socket.user.id,
        ])

        if (games.length === 0) {
          socket.emit("error", { message: "No puedes finalizar esta partida" })
          return
        }

        // Actualizar la partida en la base de datos - CONFIAR EN EL CLIENTE
        await executeQuery("UPDATE game SET winner = ?, ended_at = NOW() WHERE id = ?", [winnerId, gameId])

        // Obtener información del ganador
        const winner = await executeQuery("SELECT username FROM users WHERE id = ?", [winnerId])

        // Emitir el fin de partida a todos los usuarios en la sala
        io.to(gameId.toString()).emit("gameEnded", {
          winnerId,
          winnerUsername: winner[0].username,
          message: `¡${winner[0].username} ha ganado la partida!`,
        })

        console.log(`Partida ${gameId} finalizada. Ganador: ${winner[0].username}`)
      } catch (error) {
        console.error("Error al finalizar partida:", error)
        socket.emit("error", { message: "Error al finalizar la partida" })
      }
    })

    // Manejar desconexiones
    socket.on("disconnect", () => {
      console.log(`Usuario desconectado: ${socket.user.username}`)
    })
  })

  return io
}

module.exports = setupWebSockets
