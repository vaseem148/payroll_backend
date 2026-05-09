const express = require("express");
const router = express.Router();
const { generatePayroll, getPayrolls, approvePayroll, markPaid, getDashboardStats } = require("../controllers/payrollController");

router.get("/", getPayrolls);
router.get("/dashboard-stats", getDashboardStats);
router.post("/generate", generatePayroll);
router.put("/:id/approve", approvePayroll);
router.put("/:id/mark-paid", markPaid);

module.exports = router;
