import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gisRouter from "./gis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gisRouter);

export default router;
