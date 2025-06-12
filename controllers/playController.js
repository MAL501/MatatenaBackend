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

async function registerPlay(req, res, next) {
  try {
    const userId = req.user.id;
    const { gameId } = req.params;
    const { column, dice} = req.body;

    // Validar que la columna esté presente y sea válida
    if (column === undefined) {
      throw new ApiError(400, "Se requiere la columna");
    }

    if (!["1", "2", "3", "4", "5", "6"].includes(column.toString())) {
      throw new ApiError(400, "La columna debe ser 1, 2, 3, 4, 5 o 6");
    }

    // Validar que el dado esté presente y sea un número válido
    if (dice === undefined || dice < 1 || dice > 6) {
      throw new ApiError(400, "El valor del dado debe estar entre 1 y 6");
    }

    // Verificar que la partida existe y el usuario es parte de ella
    const games = await executeQuery(
      "SELECT * FROM game WHERE id = ? AND (host_user = ? OR guest_user = ?)",
      [gameId, userId, userId]
    );

    if (games.length === 0) {
      throw new ApiError(404, "Partida no encontrada o no eres parte de ella");
    }

    // A partir de aquí deberías manejar la lógica del juego:
    // - Registrar la jugada en la base de datos
    // - Validar reglas del juego
    // - Aplicar la jugada (por ejemplo, insertar en la tabla "plays")
    // - Procesar la eliminación del oponente si `processOpponentRemoval` es true

    // Simulación de inserción de jugada (reemplaza con tu lógica real)
    await executeQuery(
      "INSERT INTO play (game_id, user_id, column, dice, created_at) VALUES (?, ?, ?, ?, NOW())",
      [gameId, userId, column, dice]
    );

    res.status(200).json({
      status: "success",
      data: {
        message: "Jugada registrada exitosamente",
        gameId,
        userId,
        column,
        dice,
      },
    });
  } catch (error) {
    next(error);
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
