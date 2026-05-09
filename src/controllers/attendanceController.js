const prisma = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

// @desc    Get attendance records
const getAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, month, year, status } = req.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (date) {
      where.date = new Date(date);
    } else if (month && year) {
      where.date = { gte: new Date(+year, +month - 1, 1), lte: new Date(+year, +month, 0) };
    }
    const attendance = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { date: "desc" },
    });
    res.json({ success: true, count: attendance.length, data: attendance });
  } catch (error) { next(error); }
};

// @desc    Check-in
const checkIn = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } });
    if (existing) throw new AppError("Already checked in today", 400);
    const attendance = await prisma.attendance.create({ data: { employeeId, date: today, checkIn: new Date(), status: "PRESENT" } });
    res.status(201).json({ success: true, data: attendance });
  } catch (error) { next(error); }
};

// @desc    Check-out
const checkOut = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const record = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } });
    if (!record) throw new AppError("No check-in found for today", 404);
    if (record.checkOut) throw new AppError("Already checked out", 400);
    const checkOutTime = new Date();
    const hoursWorked = ((checkOutTime - record.checkIn) / 3600000).toFixed(2);
    const attendance = await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: checkOutTime, hoursWorked: parseFloat(hoursWorked), status: parseFloat(hoursWorked) < 4 ? "HALF_DAY" : "PRESENT" },
    });
    res.json({ success: true, data: attendance });
  } catch (error) { next(error); }
};

// @desc    Attendance summary for month
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { month, year, companyId } = req.query;
    const startDate = new Date(+year, +month - 1, 1);
    const endDate = new Date(+year, +month, 0);
    const empWhere = companyId ? { companyId, isActive: true } : { isActive: true };
    const employees = await prisma.employee.findMany({ where: empWhere, select: { id: true } });
    const ids = employees.map(e => e.id);
    const attendance = await prisma.attendance.groupBy({
      by: ["status"],
      where: { employeeId: { in: ids }, date: { gte: startDate, lte: endDate } },
      _count: { id: true },
    });
    const total = attendance.reduce((s, a) => s + a._count.id, 0);
    const present = attendance.find(a => a.status === "PRESENT")?._count?.id || 0;
    res.json({ success: true, data: { totalEmployees: employees.length, totalRecords: total, present, attendanceRate: total > 0 ? ((present / total) * 100).toFixed(1) : 0 } });
  } catch (error) { next(error); }
};

module.exports = { getAttendance, checkIn, checkOut, getAttendanceSummary };
