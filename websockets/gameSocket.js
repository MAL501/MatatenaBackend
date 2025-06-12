const { Server } = require("socket.io")
const { verifyAccessToken } = require("../utils/jwtUtils")
const { executeQuery } = require("../config/db")

// Función para obtener un dado basado en probabilidades
function getWeightedRandomDice(probabilities) {
  const total = probabilities.reduce((sum, prob) => sum + prob, 0)

  if (total === 0) {
    return Math.floor(Math.random() * 6) + 1
  }

  const normalizedProbs = probabilities.map((prob) => prob / total)
  const random = Math.random()

  let cumulativeProb = 0
  for (let i = 0; i < normalizedProbs.length; i++) {
    cumulativeProb += normalizedProbs[i]
    if (random <= cumulativeProb) {
      return i + 1
    }
  }

  return 6
}

function setupWebSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*", // Usar variable de entorno para CORS
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
        if (!gameId || isNaN(Number(gameId))) {
          socket.emit("error", { message: "ID de partida inválido" })
          return
        }
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

    // Solicitar un dado basado en probabilidades
    socket.on("requestDice", async (data) => {
      try {
        const userId = socket.user.id

        console.log(`🎲 Usuario ${userId} solicita un dado`)

        // Obtener las probabilidades del usuario
        const gamblingData = await executeQuery(
          "SELECT dice_1, dice_2, dice_3, dice_4, dice_5, dice_6 FROM gambling WHERE user_id = ?",
          [userId],
        )

        let probabilities

        if (gamblingData.length === 0) {
          // Crear registro con probabilidades por defecto
          const defaultProb = 1.0 / 6
          await executeQuery(
            "INSERT INTO gambling (user_id, dice_1, dice_2, dice_3, dice_4, dice_5, dice_6, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
            [userId, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb],
          )
          probabilities = [defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb]
        } else {
          const data = gamblingData[0]
          probabilities = [
            Number.parseFloat(data.dice_1),
            Number.parseFloat(data.dice_2),
            Number.parseFloat(data.dice_3),
            Number.parseFloat(data.dice_4),
            Number.parseFloat(data.dice_5),
            Number.parseFloat(data.dice_6),
          ]
        }

        const dice = getWeightedRandomDice(probabilities)

        console.log(`🎲 Usuario ${userId} obtuvo dado: ${dice}`)

        // Enviar el dado al usuario que lo solicitó
        socket.emit("diceGenerated", {
          dice,
          userId,
          probabilities: {
            dice_1: probabilities[0],
            dice_2: probabilities[1],
            dice_3: probabilities[2],
            dice_4: probabilities[3],
            dice_5: probabilities[4],
            dice_6: probabilities[5],
          },
        })
      } catch (error) {
        console.error("Error al generar dado:", error)
        socket.emit("error", { message: "Error al generar dado" })
      }
    })

    // Manejar jugadas - AHORA SOLO RECIBE LA COLUMNA
    socket.on("makePlay", async (data) => {
      try {
        const { gameId, column } = data // Solo recibimos gameId y column

        console.log(`🎯 Usuario ${socket.user.id} hace jugada en columna ${column}`)

        // Verificar que la partida existe y el usuario es parte de ella
        const games = await executeQuery("SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)", [
          gameId,
          socket.user.id,
          socket.user.id,
        ])

        if (games.length === 0) {
          socket.emit("error", { message: "No puedes hacer jugadas en esta partida" })
          return
        }

        // Obtener las probabilidades del usuario y generar el dado
        const gamblingData = await executeQuery(
          "SELECT dice_1, dice_2, dice_3, dice_4, dice_5, dice_6 FROM gambling WHERE user_id = ?",
          [socket.user.id],
        )

        let dice

        if (gamblingData.length === 0) {
          const defaultProb = 1.0 / 6
          const probabilities = [defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb]
          dice = getWeightedRandomDice(probabilities)

          await executeQuery(
            "INSERT INTO gambling (user_id, dice_1, dice_2, dice_3, dice_4, dice_5, dice_6, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
            [socket.user.id, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb],
          )
        } else {
          const data = gamblingData[0]
          const probabilities = [
            Number.parseFloat(data.dice_1),
            Number.parseFloat(data.dice_2),
            Number.parseFloat(data.dice_3),
            Number.parseFloat(data.dice_4),
            Number.parseFloat(data.dice_5),
            Number.parseFloat(data.dice_6),
          ]
          dice = getWeightedRandomDice(probabilities)
        }

        // Convertir el ID de columna del frontend al formato de la base de datos
        let dbColumn
        if (["1", "2", "3"].includes(column)) {
          dbColumn = Number.parseInt(column) - 1 // 0, 1, 2
        } else if (["4", "5", "6"].includes(column)) {
          dbColumn = Number.parseInt(column) - 4 // 0, 1, 2
        } else {
          socket.emit("error", { message: "ID de columna inválido" })
          return
        }

        // Registrar la jugada en la base de datos
        await executeQuery("INSERT INTO plays (match_id, move, dice, col, created_at) VALUES (?, ?, ?, ?, NOW())", [
          gameId,
          socket.user.id,
          dice,
          dbColumn,
        ])

        console.log(`🔍 DEBUG - Datos que se van a emitir:`)
        console.log(`🔍 gameId: ${gameId}`)
        console.log(`🔍 userId: ${socket.user.id}`)
        console.log(`🔍 username: ${socket.user.username}`)
        console.log(`🔍 dice: ${dice} (generado por servidor)`)
        console.log(`🔍 column: ${column}`)

        // Emitir la jugada a todos los usuarios en la sala
        io.to(gameId.toString()).emit("playMade", {
          userId: socket.user.id,
          username: socket.user.username,
          dice, // Dado generado por el servidor
          column,
          gameId,
          timestamp: new Date().toISOString(),
        })

        console.log(`✅ Evento playMade emitido a la sala: ${gameId}`)
        console.log(`${socket.user.username} hizo una jugada: dado ${dice}, columna ${column}`)
      } catch (error) {
        console.error("Error al procesar jugada:", error)
        socket.emit("error", { message: "Error al procesar la jugada" })
      }
    })

    // Resto de los eventos (getGameState, endGame, etc.) permanecen igual...
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
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
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
