const { validationResult } = require('express-validator');
const Product = require('../models/product');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const productController = {
  // Get all products with filters - MEJORADO CON ORDENAMIENTO POR SKU NUMÉRICO
  async getAllProducts(req, res) {
    try {
      const { search, category, page = 1, limit = 10 } = req.query;
      const where = {};

      if (search) {
        where[Op.or] = [
          { nombre: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { categoria: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (category && category !== 'all') {
        where.categoria = category;
      }

      const offset = (page - 1) * limit;
      
      // ✅ MEJORADO: Obtener todos los productos que coincidan con los filtros
      const allProducts = await Product.findAll({
        where,
        raw: true,
        subQuery: false
      });

      // ✅ ORDENAR POR SKU NUMÉRICO (P001, P002, P003... en lugar de P001, P010, P011...)
      const sortedProducts = allProducts.sort((a, b) => {
        const numA = parseInt(a.sku.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.sku.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      // ✅ Aplicar paginación DESPUÉS del ordenamiento
      const paginatedProducts = sortedProducts.slice(offset, offset + parseInt(limit));
      const count = sortedProducts.length;

      res.json({
        success: true,
        data: paginatedProducts,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Get single product
  async getProductById(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Create product
  async createProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const existingProduct = await Product.findOne({ where: { sku: req.body.sku } });
      if (existingProduct) {
        return res.status(400).json({ success: false, message: 'SKU already exists' });
      }

      const product = await Product.create(req.body);
      res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Update product
  async updateProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const product = await Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      if (req.body.sku && req.body.sku !== product.sku) {
        const existingProduct = await Product.findOne({ where: { sku: req.body.sku } });
        if (existingProduct) {
          return res.status(400).json({ success: false, message: 'SKU already exists' });
        }
      }

      await product.update(req.body);
      res.json({ success: true, data: product, message: 'Product updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Delete product
  async deleteProduct(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      await product.destroy();
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const products = await Product.findAll();
      
      const totalProducts = products.length;
      const totalInventoryValue = products.reduce((sum, p) => 
        sum + (p.stock_actual * parseFloat(p.precio_compra)), 0);
      
      const lowStockProducts = products.filter(p => p.stock_actual < p.stock_minimo).length;
      
      let mostValuableProduct = null;
      let maxValue = 0;
      products.forEach(p => {
        const value = p.stock_actual * parseFloat(p.precio_compra);
        if (value > maxValue) {
          maxValue = value;
          mostValuableProduct = { nombre: p.nombre, valor: value };
        }
      });

      // Top 10 categories
      const categoryCount = {};
      const categoryValue = {};
      products.forEach(p => {
        categoryCount[p.categoria] = (categoryCount[p.categoria] || 0) + 1;
        categoryValue[p.categoria] = (categoryValue[p.categoria] || 0) + 
          (p.stock_actual * parseFloat(p.precio_compra));
      });

      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const categoryDistribution = Object.entries(categoryValue).map(([name, value]) => ({ name, value }));

      const reorderProducts = products
        .filter(p => p.stock_actual < p.stock_minimo)
        .map(p => ({
          sku: p.sku,
          nombre: p.nombre,
          stock_actual: p.stock_actual,
          stock_minimo: p.stock_minimo,
          proveedor: p.proveedor
        }));

      res.json({
        success: true,
        data: {
          kpis: {
            totalProducts,
            totalInventoryValue,
            lowStockProducts,
            mostValuableProduct
          },
          charts: {
            topCategories,
            categoryDistribution
          },
          reorderProducts
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Get categories list
  async getCategories(req, res) {
    try {
      const categories = await Product.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('categoria')), 'categoria']],
        order: [['categoria', 'ASC']]
      });
      res.json({ success: true, data: categories.map(c => c.categoria) });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
};

module.exports = productController;