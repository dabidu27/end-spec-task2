import type { FastifyPluginAsync } from "fastify";
import { getMe, updateTimezone } from "../controllers/meController.js";

const meRoutes: FastifyPluginAsync = async (app) => {
    app.get('/', getMe);
    app.put('/', updateTimezone);
}

export default meRoutes