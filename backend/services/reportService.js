const Product = require('../models/product');
const { Op } = require('sequelize');

// ⚠️ IMPORTANTE: jsreport debe estar instalado y configurado en otro archivo
// const jsreport = require('jsreport');

class ReportService {
  constructor() {
    this.initJsReport();
  }

  async initJsReport() {
    console.log('✅ JSReport initialized');
  }

  // 📊 REPORTE OPERACIONAL
  async generateOperationalReport(category = 'all') {
    try {
      const where = category !== 'all' ? { categoria: category } : {};
      const products = await Product.findAll({ where });

      const reportData = products.map(p => ({
        sku: p.sku,
        nombre: p.nombre,
        stock_actual: p.stock_actual,
        valor_total: p.stock_actual * parseFloat(p.precio_venta),
        precio_venta: p.precio_venta,
        categoria: p.categoria
      }));

      const totalValue = reportData.reduce(
        (sum, p) => sum + p.valor_total,
        0
      );

      const report = await jsreport.render({
        template: {
          name: 'operational-report',
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          content: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Reporte Operacional</title>
              <style>
                body { font-family: Arial; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 10px; }
                th { background: #2563eb; color: white; }
                .summary { margin: 20px 0; padding: 10px; background: #f3f4f6; }
              </style>
            </head>
            <body>

              <div class="header">
                <h2>📦 Sistema de Productos</h2>
                <h3>Reporte Operacional</h3>
                <p>${new Date().toLocaleDateString()}</p>
                <p>Categoría: ${category === 'all' ? 'Todas' : category}</p>
              </div>

              <div class="summary">
                <p><b>Total productos:</b> ${reportData.length}</p>
                <p><b>Valor total:</b> $${totalValue.toFixed(2)}</p>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Precio</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData
                    .map(
                      p => `
                    <tr>
                      <td>${p.sku}</td>
                      <td>${p.nombre}</td>
                      <td>${p.categoria}</td>
                      <td>${p.stock_actual}</td>
                      <td>$${parseFloat(p.precio_venta).toFixed(2)}</td>
                      <td>$${p.valor_total.toFixed(2)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>

            </body>
            </html>
          `
        },
        data: reportData
      });

      return report.content;
    } catch (error) {
      console.error('Error generating operational report:', error);
      throw error;
    }
  }

  // 📈 REPORTE DE GESTIÓN
  async generateManagementReport() {
    try {
      const products = await Product.findAll();

      const totalProducts = products.length;

      const totalInventoryValue = products.reduce(
        (sum, p) =>
          sum + p.stock_actual * parseFloat(p.precio_compra),
        0
      );

      const lowStockProducts = products.filter(
        p => p.stock_actual < p.stock_minimo
      );

      const categoryStats = {};

      products.forEach(p => {
        if (!categoryStats[p.categoria]) {
          categoryStats[p.categoria] = {
            count: 0,
            value: 0
          };
        }

        categoryStats[p.categoria].count++;
        categoryStats[p.categoria].value +=
          p.stock_actual * parseFloat(p.precio_compra);
      });

      const topCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      const report = await jsreport.render({
        template: {
          name: 'management-report',
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          content: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Reporte de Gestión</title>
              <style>
                body { font-family: Arial; margin: 40px; }
                .kpi { margin: 10px 0; padding: 10px; background: #f3f4f6; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; }
                th { background: #2563eb; color: white; }
              </style>
            </head>
            <body>

              <h2>📊 Reporte de Gestión</h2>
              <p>${new Date().toLocaleString()}</p>

              <div class="kpi">
                <p><b>Total productos:</b> ${totalProducts}</p>
                <p><b>Valor inventario:</b> $${totalInventoryValue.toFixed(2)}</p>
                <p><b>Bajo stock:</b> ${lowStockProducts.length}</p>
              </div>

              <h3>Categorías</h3>
              <table>
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Productos</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${topCategories
                    .map(
                      ([cat, data]) => `
                    <tr>
                      <td>${cat}</td>
                      <td>${data.count}</td>
                      <td>$${data.value.toFixed(2)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>

            </body>
            </html>
          `
        }
      });

      return report.content;
    } catch (error) {
      console.error('Error generating management report:', error);
      throw error;
    }
  }
}

module.exports = new ReportService();