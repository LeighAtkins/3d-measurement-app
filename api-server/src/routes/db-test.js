import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/db-test", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() as time");
    res.json({ success: true, time: result.rows[0].time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
