const express = require("express");
const router = express.Router();
const { getAttendance, checkIn, checkOut, getAttendanceSummary } = require("../controllers/attendanceController");

router.get("/", getAttendance);
router.get("/summary", getAttendanceSummary);
router.post("/check-in", checkIn);
router.put("/check-out", checkOut);

module.exports = router;
