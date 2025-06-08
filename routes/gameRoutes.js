const express = require('express');
const { createGame, joinGameByCode, endGame, getGame, getGameByCode } = require('../controllers/gameController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

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
router.post('/', createGame);

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
router.post('/join', joinGameByCode);

/**
 * @swagger
 * /games/{gameId}/end:
 *   put:
 *     summary: Finalizar una partida
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:gameId/end', endGame);

/**
 * @swagger
 * /games/{gameId}:
 *   get:
 *     summary: Obtener información de una partida por ID
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:gameId', getGame);

/**
 * @swagger
 * /games/code/{code}:
 *   get:
 *     summary: Obtener información de una partida por código
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 */
router.get('/code/:code', getGameByCode);

module.exports = router;