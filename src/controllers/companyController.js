// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Company Controller
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const prisma = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

// @desc    Get all companies
// @route   GET /api/companies
const getCompanies = async (req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single company
// @route   GET /api/companies/:id
const getCompany = async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        employees: { select: { id: true, firstName: true, lastName: true, designation: true, isActive: true } },
        departments: true,
        _count: { select: { employees: true } },
      },
    });
    if (!company) throw new AppError("Company not found", 404);
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

// @desc    Create company
// @route   POST /api/companies
const createCompany = async (req, res, next) => {
  try {
    const company = await prisma.company.create({ data: req.body });
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
const updateCompany = async (req, res, next) => {
  try {
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
const deleteCompany = async (req, res, next) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Company deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCompanies, getCompany, createCompany, updateCompany, deleteCompany };
