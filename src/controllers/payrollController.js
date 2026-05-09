const prisma = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

// @desc    Calculate & generate payroll for a month
// @route   POST /api/payroll/generate
const generatePayroll = async (req, res, next) => {
  try {
    const { companyId, month, year } = req.body;
    const m = parseInt(month), y = parseInt(year);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);
    const workingDays = getWorkingDays(y, m);

    const employees = await prisma.employee.findMany({
      where: { companyId, isActive: true },
      include: {
        attendance: { where: { date: { gte: startDate, lte: endDate }, status: { in: ["PRESENT", "LATE"] } } },
      },
    });

    const payrolls = [];
    for (const emp of employees) {
      const existing = await prisma.payroll.findUnique({ where: { employeeId_month_year: { employeeId: emp.id, month: m, year: y } } });
      if (existing) continue;

      const presentDays = emp.attendance.length;
      const base = parseFloat(emp.baseSalary);
      const perDay = base / workingDays;
      const earned = parseFloat((perDay * presentDays).toFixed(2));

      // Allowances
      const hra = parseFloat((base * 0.20).toFixed(2));
      const da = parseFloat((base * 0.10).toFixed(2));
      const conveyance = 1600;
      const medical = 1250;
      const grossSalary = parseFloat((earned + hra + da + conveyance + medical).toFixed(2));

      // Deductions
      const pf = parseFloat((base * 0.12).toFixed(2));
      const esi = grossSalary <= 21000 ? parseFloat((grossSalary * 0.0075).toFixed(2)) : 0;
      const profTax = 200;
      const incomeTax = parseFloat((grossSalary * 0.05).toFixed(2));
      const totalDeductions = parseFloat((pf + esi + profTax + incomeTax).toFixed(2));
      const netPay = parseFloat((grossSalary - totalDeductions).toFixed(2));

      const payroll = await prisma.payroll.create({
        data: {
          employeeId: emp.id, month: m, year: y, workingDays, presentDays,
          baseSalary: base, earnedSalary: earned, hra, da, conveyance, medicalAllowance: medical,
          grossSalary, pf, esi, professionalTax: profTax, incomeTax, totalDeductions, netPay,
          status: "DRAFT",
        },
      });
      payrolls.push(payroll);
    }

    res.status(201).json({ success: true, count: payrolls.length, data: payrolls });
  } catch (error) { next(error); }
};

// @desc    Get payroll records
const getPayrolls = async (req, res, next) => {
  try {
    const { month, year, employeeId, status } = req.query;
    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const payrolls = await prisma.payroll.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    const totalSpend = payrolls.reduce((s, p) => s + parseFloat(p.netPay), 0);
    res.json({ success: true, count: payrolls.length, totalSpend, data: payrolls });
  } catch (error) { next(error); }
};

// @desc    Approve payroll
const approvePayroll = async (req, res, next) => {
  try {
    const payroll = await prisma.payroll.update({
      where: { id: req.params.id },
      data: { status: "APPROVED" },
    });
    res.json({ success: true, data: payroll });
  } catch (error) { next(error); }
};

// @desc    Mark payroll as paid
const markPaid = async (req, res, next) => {
  try {
    const payroll = await prisma.payroll.update({
      where: { id: req.params.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    res.json({ success: true, data: payroll });
  } catch (error) { next(error); }
};

// @desc    Dashboard stats
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const m = now.getMonth() + 1, y = now.getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const [totalEmployees, activeEmployees, todayAttendance, monthPayroll] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { isActive: true } }),
      prisma.attendance.count({ where: { date: { gte: new Date(new Date().setHours(0,0,0,0)) }, status: "PRESENT" } }),
      prisma.payroll.aggregate({ where: { month: m, year: y }, _sum: { netPay: true, grossSalary: true, totalDeductions: true }, _count: { id: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees, activeEmployees, todayAttendance,
        attendanceRate: activeEmployees > 0 ? ((todayAttendance / activeEmployees) * 100).toFixed(1) : 0,
        payroll: {
          totalNetPay: monthPayroll._sum.netPay || 0,
          totalGross: monthPayroll._sum.grossSalary || 0,
          totalDeductions: monthPayroll._sum.totalDeductions || 0,
          processedCount: monthPayroll._count.id,
        },
      },
    });
  } catch (error) { next(error); }
};

function getWorkingDays(year, month) {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

module.exports = { generatePayroll, getPayrolls, approvePayroll, markPaid, getDashboardStats };
