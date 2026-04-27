const { validationResult } = require('express-validator');
const Product = require('../models/product');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const audit = require('../services/auditService');

const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

const productController = {
  async getAllProducts(req, res) {
    try {
      const { search, category, page = 1, limit = 10 } = req.query;
      const where = {
          activo: true
      };
      if (search) {
        where[Op.or] = [
          { nombre:    { [Op.iLike]: `%${search}%` } },
          { sku:       { [Op.iLike]: `%${search}%` } },
          { categoria: { [Op.iLike]: `%${search}%` } },
        ];
      }
      if (category && category !== 'all') where.categoria = category;

      const offset = (page - 1) * limit;
      const allProducts = await Product.findAll({ where, raw: true, subQuery: false });
      const sortedProducts = allProducts.sort((a, b) => {
        const numA = parseInt(a.sku.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.sku.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      const paginatedProducts = sortedProducts.slice(offset, offset + parseInt(limit));
      const count = sortedProducts.length;

      res.json({
        success: true,
        data: paginatedProducts,
        pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit), limit: parseInt(limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  async getProductById(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  async createProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const existingProduct = await Product.findOne({ where: { sku: req.body.sku } });
      if (existingProduct) return res.status(400).json({ success: false, message: 'SKU already exists' });

      const product = await Product.create(req.body);

      // ── Auditoría ──
      await audit.registrar({
        accion:     'PRODUCT_CREATE',
        user_id:    req.user?.id,
        user_email: req.user?.email,
        user_rol:   req.user?.rol,
        entidad:    'product',
        entidad_id: product.id,
        detalle:    { nombre: product.nombre, sku: product.sku },
        ip:         getIP(req),
      });

      res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  async updateProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const product = await Product.findByPk(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      if (req.body.sku && req.body.sku !== product.sku) {
        const existingProduct = await Product.findOne({ where: { sku: req.body.sku } });
        if (existingProduct) return res.status(400).json({ success: false, message: 'SKU already exists' });
      }

      const antes = { nombre: product.nombre, sku: product.sku, precio_venta: product.precio_venta };
      await product.update({ activo: false });

      // ── Auditoría ──
      await audit.registrar({
        accion:     'PRODUCT_UPDATE',
        user_id:    req.user?.id,
        user_email: req.user?.email,
        user_rol:   req.user?.rol,
        entidad:    'product',
        entidad_id: product.id,
        detalle:    { antes, despues: req.body },
        ip:         getIP(req),
      });

      res.json({ success: true, data: product, message: 'Product updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  async deleteProduct(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      const info = { nombre: product.nombre, sku: product.sku };
      await product.update({ activo: false });

      // ── Auditoría ──
      await audit.registrar({
        accion:     'PRODUCT_DELETE',
        user_id:    req.user?.id,
        user_email: req.user?.email,
        user_rol:   req.user?.rol,
        entidad:    'product',
        entidad_id: parseInt(req.params.id),
        detalle:    info,
        ip:         getIP(req),
      });

      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  async getDashboardStats(req, res) {
    try {
      const products = await Product.findAll();
      const totalProducts = products.length;
      const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock_actual * parseFloat(p.precio_compra)), 0);
      const lowStockProducts = products.filter(p => p.stock_actual < p.stock_minimo).length;
      let mostValuableProduct = null;
      let maxValue = 0;
      products.forEach(p => {
        const value = p.stock_actual * parseFloat(p.precio_compra);
        if (value > maxValue) { maxValue = value; mostValuableProduct = { nombre: p.nombre, valor: value }; }
      });
      const categoryCount = {};
      const categoryValue = {};
      products.forEach(p => {
        categoryCount[p.categoria] = (categoryCount[p.categoria] || 0) + 1;
        categoryValue[p.categoria] = (categoryValue[p.categoria] || 0) + (p.stock_actual * parseFloat(p.precio_compra));
      });
      const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
      const categoryDistribution = Object.entries(categoryValue).map(([name, value]) => ({ name, value }));
      const reorderProducts = products.filter(p => p.stock_actual < p.stock_minimo).map(p => ({ sku: p.sku, nombre: p.nombre, stock_actual: p.stock_actual, stock_minimo: p.stock_minimo, proveedor: p.proveedor }));
      res.json({ success: true, data: { kpis: { totalProducts, totalInventoryValue, lowStockProducts, mostValuableProduct }, charts: { topCategories, categoryDistribution }, reorderProducts } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  async getCategories(req, res) {
    try {
      const categories = await Product.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('categoria')), 'categoria']],
        order: [['categoria', 'ASC']],
      });
      res.json({ success: true, data: categories.map(c => c.categoria) });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },
};

module.exports = productController;