const { executeQuery } = require("../config/db")
const { ApiError } = require("../utils/errorHandler")

// Función para obtener un dado basado en probabilidades (misma que en diceController)
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

// Registrar una jugada - AHORA EL SERVIDOR PROPORCIONA EL DADO
async function registerPlay(req, res, next) {
  try {
    const userId = req.user.id
    const { gameId } = req.params
    const { column } = req.body // Solo necesitamos la columna, el dado lo genera el servidor

    // Validar que la columna esté presente
    if (column === undefined) {
      throw new ApiError(400, "Se requiere la columna")
    }

    // Validar que column sea un string válido del frontend
    if (!["1", "2", "3", "4", "5", "6"].includes(column.toString())) {
      throw new ApiError(400, "La columna debe ser 1, 2, 3, 4, 5 o 6")
    }

    // Verificar que la partida existe y el usuario es parte de ella
    const games = await executeQuery("SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)", [
      gameId,
      userId,
      userId,
    ])

    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada o no eres parte de ella")
    }

    // Obtener las probabilidades del usuario y generar el dado
    const gamblingData = await executeQuery(
      "SELECT dice_1, dice_2, dice_3, dice_4, dice_5, dice_6 FROM gambling WHERE user_id = ?",
      [userId],
    )

    let dice

    if (gamblingData.length === 0) {
      // Si no hay datos de gambling, usar probabilidades iguales
      const defaultProb = 1.0 / 6
      const probabilities = [defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb]
      dice = getWeightedRandomDice(probabilities)

      // Crear registro por defecto
      await executeQuery(
        "INSERT INTO gambling (user_id, dice_1, dice_2, dice_3, dice_4, dice_5, dice_6, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [userId, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb, defaultProb],
      )
    } else {
      // Usar las probabilidades existentes
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
    if (["1", "2", "3"].includes(column.toString())) {
      dbColumn = Number.parseInt(column.toString()) - 1 // 0, 1, 2
    } else {
      dbColumn = Number.parseInt(column.toString()) - 4 // 0, 1, 2
    }

    // Registrar la jugada con el dado generado por el servidor
    const result = await executeQuery(
      "INSERT INTO plays (match_id, move, dice, col, created_at) VALUES (?, ?, ?, ?, NOW())",
      [gameId, userId, dice, dbColumn],
    )

    const playId = result.insertId

    // Obtener información del usuario que hizo la jugada
    const user = await executeQuery("SELECT username FROM users WHERE id = ?", [userId])

    console.log(`🎲 Jugada registrada: Usuario ${userId} obtuvo dado ${dice} en columna ${column}`)

    res.status(201).json({
      status: "success",
      message: "Jugada registrada correctamente",
      data: {
        playId,
        gameId,
        userId,
        username: user[0].username,
        dice, // El dado generado por el servidor
        column: column.toString(),
        dbColumn,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtener jugadas de una partida
async function getGamePlays(req, res, next) {
  try {
    const { gameId } = req.params

    // Verificar si la partida existe
    const games = await executeQuery("SELECT * FROM game WHERE id = ?", [gameId])
    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada")
    }

    // Obtener todas las jugadas de la partida con información del usuario
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

    res.status(200).json({
      status: "success",
      data: {
        plays,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  registerPlay,
  getGamePlays,
}
