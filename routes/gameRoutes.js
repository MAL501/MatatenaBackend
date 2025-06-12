const express = require("express")
const {
  createGame,
  joinGameByCode,
  endGame,
  getGame,
  getGameByCode,
  getGameState,
  deleteGame, // Importar el servicio
} = require("../controllers/gameController")
const { authenticate } = require("../middleware/authMiddleware")

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(authenticate)

/**
 * @swagger
 * /games:
 *   post:
 *     summary: Crear una nueva partida
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Partida creada correctamente
 */
router.post("/", createGame)

/**
 * @swagger
 * /games/join:
 *   post:
 *     summary: Unirse a una partida usando código
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "ABC12"
 *     responses:
 *       200:
 *         description: Te has unido a la partida correctamente
 */
router.post("/join", joinGameByCode)

/**
 * @swagger
 * /games/{gameId}/end:
 *   put:
 *     summary: Finalizar una partida
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:gameId/end", endGame)

/**
 * @swagger
 * /games/{gameId}:
 *   get:
 *     summary: Obtener información de una partida por ID
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:gameId", getGame)

/**
 * @swagger
 * /games/code/{code}:
 *   get:
 *     summary: Obtener información de una partida por código
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 */
router.get("/code/:code", getGameByCode)

/**
 * @swagger
 * /games/{gameId}/state:
 *   get:
 *     summary: Obtener estado completo de una partida con información de columnas
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único de la partida
 *     responses:
 *       200:
 *         description: Estado completo de la partida
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         game:
 *                           $ref: '#/components/schemas/Game'
 *                         columns:
 *                           type: object
 *                           description: Estado de todas las columnas del juego
 *                         columnAvailability:
 *                           type: object
 *                           description: Espacios disponibles en cada columna
 *                         currentTurn:
 *                           type: integer
 *                           description: ID del usuario cuyo turno es actual
 *                         plays:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Play'
 *                         gameStatus:
 *                           type: string
 *                           enum: [waiting, playing, finished]
 *       404:
 *         description: Partida no encontrada
 */
router.get("/:gameId/state", getGameState)

/**
 * @swagger
 * /games/{gameId}:
 *   delete:
 *     summary: Eliminar una partida (solo el host puede eliminarla)
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único de la partida
 *     responses:
 *       200:
 *         description: Partida eliminada correctamente
 *       403:
 *         description: Solo el host puede eliminar la partida o la partida no existe
 */
router.delete("/:gameId", deleteGame)

module.exports = router
