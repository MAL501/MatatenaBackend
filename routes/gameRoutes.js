const express = require('express');
const { createGame, joinGame, endGame, getGame } = require('../controllers/gameController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @swagger
 * /api/games:
 *   post:
 *     summary: Crear una nueva partida
 *     tags: [Juegos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Partida creada correctamente
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
 *                         gameId:
 *                           type: string
 *                           example: "550e8400-e29b-41d4-a716-446655440000"
 *                         hostUserId:
 *                           type: integer
 *                           example: 1
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createGame);

/**
 * @swagger
 * /api/games/{gameId}/join:
 *   post:
 *     summary: Unirse a una partida existente
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
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Te has unido a la partida correctamente
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
 *                         gameId:
 *                           type: string
 *                         hostUserId:
 *                           type: integer
 *                         guestUserId:
 *                           type: integer
 *       404:
 *         description: Partida no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: La partida ya está completa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:gameId/join', joinGame);

/**
 * @swagger
 * /api/games/{gameId}/end:
 *   put:
 *     summary: Finalizar una partida
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - winnerId
 *             properties:
 *               winnerId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Partida finalizada correctamente
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
 *                         gameId:
 *                           type: string
 *                         winnerId:
 *                           type: integer
 *       404:
 *         description: Partida no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:gameId/end', endGame);

/**
 * @swagger
 * /api/games/{gameId}:
 *   get:
 *     summary: Obtener información de una partida
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
 *         description: Información de la partida
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
 *       404:
 *         description: Partida no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:gameId', getGame);

module.exports = router;